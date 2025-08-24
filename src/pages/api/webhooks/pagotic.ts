// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import * as qs from "querystring";

// ✅ Garante Node.js runtime (evita Edge esquisito)
export const runtime = "nodejs";

// ✅ Desliga o bodyParser para lermos o raw body e tratarmos urlencoded/JSON
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
function normalizeOrderStatus(statusRaw?: string): "PAID" | "PENDING" | "CANCELLED" {
  const s = (statusRaw ?? "").trim().toLowerCase();
  const approved = new Set(["approved", "accredited", "paid", "aprobado", "pagado"]);
  if (approved.has(s)) return "PAID";
  const cancelled = new Set(["rejected", "cancelled", "canceled", "refunded", "objected"]);
  if (cancelled.has(s)) return "CANCELLED";
  const pendingish = new Set(["pending", "issued", "in_process", "review", "validate"]);
  if (pendingish.has(s)) return "PENDING";
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
    const p = qs.parse(raw);
    return {
      id: toStr(p.id),
      status: toStr(p.status),
      final_amount: p.final_amount ? Number(p.final_amount) : undefined,
      currency: toStr(p.currency),
      collector: toStr(p.collector),
      external_transaction_id: toStr(p.external_transaction_id),
      payment_number: p.payment_number as string | number | null | undefined,
      metadata: p.metadata,
    };
  }

  // JSON (fallback)
  try {
    return JSON.parse(raw) as PagoTicNotification;
  } catch {
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS básico (não é obrigatório p/ server→server, mas não atrapalha)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: ping de saúde
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, method: "GET" });
  }

  // Apenas POST altera estado
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  console.log("[PAGOTIC][Webhook] Incoming:", {
    method: req.method,
    "content-type": req.headers["content-type"],
  });

  try {
    const body = await parseNotification(req);

    // Guard por collector (se vier preenchido e diferente, ignore)
    if (process.env.PAGOTIC_COLLECTOR_ID) {
      const collector = toStr(body.collector);
      if (collector && collector !== process.env.PAGOTIC_COLLECTOR_ID) {
        console.warn("[PagoTIC][Webhook] Collector divergente:", {
          got: collector,
          expected: process.env.PAGOTIC_COLLECTOR_ID,
        });
        return res.status(200).json({ ok: true });
      }
    }

    const ext = toStr(body.external_transaction_id);
    if (!ext) {
      console.error("[PagoTIC][Webhook] external_transaction_id ausente");
      return res.status(200).json({ ok: true });
    }

    const orderId = resolveOrderIdFromExternal(ext);
    const nextStatus = normalizeOrderStatus(body.status);
    const paymentId = toStr(body.id);

    console.log("[PAGOTIC][Webhook] Parsed:", { orderId, status: body.status, normalized: nextStatus, paymentId });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, event: true },
    });
    if (!order) {
      console.error("[PagoTIC][Webhook] Order não encontrada:", orderId);
      return res.status(200).json({ ok: true });
    }

    // Idempotência simples
    if (order.status === "PAID" && nextStatus === "PAID") {
      console.log("[PAGOTIC][Webhook] Order já paga, ignorando:", orderId);
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
