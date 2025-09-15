import type { NextApiRequest, NextApiResponse } from "next";
import * as qs from "querystring";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import { reconcileOrderByPaymentId } from "@/modules/pagotic/pagotic.reconcile";

export const config = { api: { bodyParser: false } };

type PagoTicNotification = {
  id?: string;
  status?: string;
  final_amount?: number;
  currency?: string;
  collector?: string;
  external_transaction_id?: string;
  metadata?: string | Record<string, string | number | boolean | null>;
  payment_number?: string | number | null;
};

// ------------------------
// Helpers
// ------------------------

function toStr(v: string | string[] | number | undefined | null): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function resolveOrderIdFromExternal(externalId: string): string {
  return externalId.toLowerCase().startsWith("order_") ? externalId.slice(6) : externalId;
}

function normalizeOrderStatus(statusRaw: string | undefined): "PAID" | "PENDING" | "CANCELLED" {
  const s = (statusRaw ?? "").trim().toLowerCase();
  const approved = new Set(["approved", "accredited", "paid", "aprobado", "pagado"]);
  if (approved.has(s)) return "PAID";
  const cancelled = new Set(["rejected", "cancelled", "canceled"]);
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

  if (ct.includes("application/x-www-form-urlencoded")) {
    const parsed = qs.parse(raw);
    return {
      id: toStr(parsed.id as string | string[] | undefined),
      status: toStr(parsed.status as string | string[] | undefined),
      final_amount: parsed.final_amount ? Number(parsed.final_amount) : undefined,
      currency: toStr(parsed.currency as string | string[] | undefined),
      collector: toStr(parsed.collector as string | string[] | undefined),
      external_transaction_id: toStr(parsed.external_transaction_id as string | string[] | undefined),
      payment_number: toStr(parsed.payment_number as string | string[] | undefined),
      metadata: toStr(parsed.metadata as string | string[] | undefined) ?? {},
    };
  }

  try {
    const json = JSON.parse(raw) as PagoTicNotification;
    return json;
  } catch {
    return {};
  }
}

// ------------------------
// Handler principal
// ------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, method: req.method });
  }

  try {
    const rawBody = await readRawBody(req);

    // 🔹 1) Repassa para o CMS (garante email oficial do PagoTIC)
    try {
      await fetch("https://app.cmsargentina.com/acquisition/v2/notify", {
        method: "POST",
        headers: { "Content-Type": req.headers["content-type"] || "application/json" },
        body: rawBody,
      });
    } catch (err) {
      console.error("[PagoTIC][Proxy] erro ao reenviar para CMS:", err);
    }

    // 🔹 2) Processa localmente (como no pagotic.ts / pagotic-cms.ts)
    const body = await parseNotification(req);

    // valida collector se configurado
    const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
    const collectorGot = body.collector ?? null;
    if (expectedCollector && collectorGot && collectorGot !== expectedCollector) {
      console.warn("[PagoTIC][Proxy] Collector diferente", { got: collectorGot, expected: expectedCollector });
      return res.status(200).json({ ok: true });
    }

    const ext = body.external_transaction_id ?? "";
    if (!ext) {
      console.error("[PagoTIC][Proxy] external_transaction_id ausente");
      return res.status(200).json({ ok: true });
    }

    const orderId = resolveOrderIdFromExternal(ext);
    const nextStatus = normalizeOrderStatus(body.status);
    const paymentId =
      body.id ?? (typeof body.payment_number === "string" ? body.payment_number : String(body.payment_number ?? ""));

    // tenta buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Event: true },
    });
    if (!order) {
      console.error("[PagoTIC][Proxy] Order não encontrada:", orderId);
      return res.status(200).json({ ok: true });
    }

    if (order.status === "PAID" && nextStatus === "PAID") {
      return res.status(200).json({ ok: true, message: "Already PAID" });
    }

    // atualiza status no banco
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        externalTransactionId: ext,
        paymentNumber: paymentId || order.paymentNumber,
      },
      include: { user: true, Event: true },
    });

    // se pago → gera tickets + envia email
    if (nextStatus === "PAID") {
      try {
        const ticketsAll = await generateTicketsFromOrder(updated.id);
        const tickets = (ticketsAll as Ticket[]).filter((t) => Boolean(t));
        if (updated.user?.email) {
          await sendTicketEmail(updated.user, updated.Event, tickets);
        }
      } catch (e) {
        console.error("[PagoTIC][Proxy] pós-pagamento falhou:", e instanceof Error ? e.message : String(e));
      }
    }

    // 🔹 3) Reconciliação adicional (como no pagotic-cms.ts)
    if (paymentId) {
      try {
        await reconcileOrderByPaymentId(paymentId);
      } catch (err) {
        console.error("[PagoTIC][Proxy] reconcile error:", err);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[PagoTIC][Proxy] erro inesperado:", e instanceof Error ? e.message : String(e));
    return res.status(200).json({ ok: true });
  }
}
