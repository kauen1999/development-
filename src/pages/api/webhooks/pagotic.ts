// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import * as qs from "querystring";

//  Desliga o parser do Next para pegarmos o raw body e tratar urlencoded
export const config = { api: { bodyParser: false } };

// Helpers
function toStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}
function resolveOrderIdFromExternal(externalId: string): string {
  if (!externalId.toLowerCase().startsWith("order_")) return externalId;
  return externalId.slice(6);
}
type PagoTicNotification = {
  id?: string;
  status?: string;
  final_amount?: number;
  currency?: string;
  collector?: string;
  external_transaction_id?: string;
  metadata?: unknown;
  payment_number?: string | number | null;
};

function normalizeOrderStatus(
  statusRaw: string | undefined
): "PAID" | "PENDING" | "CANCELLED" {
  const s = (statusRaw ?? "").trim().toLowerCase();
  const approved = new Set(["approved","accredited","paid","aprobado","pagado"]);
  if (approved.has(s)) return "PAID";
  const cancelled = new Set(["rejected","cancelled","canceled"]);
  if (cancelled.has(s)) return "CANCELLED";
  return "PENDING";
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function parseNotification(req: NextApiRequest): Promise<PagoTicNotification> {
  const ct = String(req.headers["content-type"] ?? "");
  const raw = await readRawBody(req);

  // x-www-form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded")) {
    const parsed = qs.parse(raw);
    return {
      id: toStr(parsed.id),
      status: toStr(parsed.status),
      final_amount: parsed.final_amount ? Number(parsed.final_amount) : undefined,
      currency: toStr(parsed.currency),
      collector: toStr(parsed.collector),
      external_transaction_id: toStr(parsed.external_transaction_id),
      payment_number: parsed.payment_number as string | number | null | undefined,
      metadata: parsed.metadata, // pode vir string JSON; se precisar, tente JSON.parse aqui
    };
  }

  // JSON
  try {
    return JSON.parse(raw) as PagoTicNotification;
  } catch {
    // fallback vazio para não quebrar
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[PAGOTIC][Webhook] Incoming request:", {
    method: req.method,
    headers: req.headers,
  });

  // PagoTIC manda POST; GET respondemos 200 p/ evitar retry storm
  if (req.method !== "POST") {
    console.warn("[PAGOTIC][Webhook] Método inesperado:", req.method);
    return res.status(200).json({ ok: true, method: req.method });
  }

  try {
    const body = await parseNotification(req);

    // ⚠️ Collector (não derrube se vier vazio; apenas logue)
    if (process.env.PAGOTIC_COLLECTOR_ID) {
      const collector = toStr(body.collector);
      if (collector && collector !== process.env.PAGOTIC_COLLECTOR_ID) {
        console.warn("[PagoTIC][Webhook] Collector divergente:", {
          got: collector,
          expected: process.env.PAGOTIC_COLLECTOR_ID,
        });
        // ainda assim respondemos 200 (não vale a pena dar retry infinito)
        return res.status(200).json({ ok: true });
      }
    }

    const ext = toStr(body.external_transaction_id);
    if (!ext) {
      console.error("[PagoTIC][Webhook] external_transaction_id ausente no payload");
      return res.status(200).json({ ok: true });
    }

    const orderId = resolveOrderIdFromExternal(ext);
    const nextStatus = normalizeOrderStatus(body.status);
    const paymentId = toStr(body.id);

    console.log("[PAGOTIC][Webhook] Parsed data:", {
      orderId, status: body.status, normalized: nextStatus, paymentId,
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, event: true },
    });
    if (!order) {
      console.error("[PagoTIC][Webhook] Order não encontrada:", orderId);
      return res.status(200).json({ ok: true });
    }

    // idempotência
    if (order.status === "PAID" && nextStatus === "PAID") {
      console.log("[PAGOTIC][Webhook] Order já estava paga:", orderId);
      return res.status(200).json({ ok: true, message: "Already PAID" });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        externalTransactionId: ext,
        paymentNumber: paymentId ?? order.paymentNumber,
      },
      include: { user: true, event: true },
    });

    console.log("[PAGOTIC][Webhook] Order atualizada:", { id: updated.id, status: updated.status });

    if (nextStatus === "PAID") {
      try {
        const ticketsRaw = await generateTicketsFromOrder(updated.id);
        const tickets = (ticketsRaw as Array<Ticket | null>).filter((t): t is Ticket => !!t);
        console.log("[PAGOTIC][Webhook] Tickets gerados:", tickets.map((t) => t.id));

        if (updated.user?.email) {
          await sendTicketEmail(updated.user, updated.event, tickets);
          console.log("[PAGOTIC][Webhook] E-mail enviado para:", updated.user.email);
        }
      } catch (e) {
        console.error("[PagoTIC][Webhook] Pós-pagamento falhou:", (e as Error).message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[PagoTIC][Webhook] Erro:", (e as Error).message);
    return res.status(200).json({ ok: true });
  }
}
