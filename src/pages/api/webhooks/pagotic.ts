// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import * as qs from "querystring";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sempre 200 para evitar retry storm, mesmo em GET/erros não-críticos
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, method: req.method });
  }

  try {
    const body = await parseNotification(req);

    // Collector opcional
    const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
    const collectorGot = body.collector ?? null;
    if (expectedCollector && collectorGot && collectorGot !== expectedCollector) {
      console.warn("[PagoTIC][Webhook] Collector diferente", { got: collectorGot, expected: expectedCollector });
      return res.status(200).json({ ok: true });
    }

    const ext = body.external_transaction_id ?? "";
    if (!ext) {
      console.error("[PagoTIC][Webhook] external_transaction_id ausente");
      return res.status(200).json({ ok: true });
    }

    const orderId = resolveOrderIdFromExternal(ext);
    const nextStatus = normalizeOrderStatus(body.status);
    const paymentId =
      body.id ?? (typeof body.payment_number === "string" ? body.payment_number : String(body.payment_number ?? ""));

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Event: true }, // <-- relação correta é 'Event'
    });
    if (!order) {
      console.error("[PagoTIC][Webhook] Order não encontrada:", orderId);
      return res.status(200).json({ ok: true });
    }

    if (order.status === "PAID" && nextStatus === "PAID") {
      return res.status(200).json({ ok: true, message: "Already PAID" });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        externalTransactionId: ext,
        paymentNumber: paymentId || order.paymentNumber,
      },
      include: { user: true, Event: true }, // <-- manter 'Event' aqui também
    });

    if (nextStatus === "PAID") {
      try {
        const ticketsAll = await generateTicketsFromOrder(updated.id);
        const tickets = (ticketsAll as Ticket[]).filter((t) => Boolean(t));
        if (updated.user?.email) {
          // <-- usar 'Event' (maiúsculo)
          await sendTicketEmail(updated.user, updated.Event, tickets);
        }
      } catch (e) {
        console.error(
          "[PagoTIC][Webhook] Pós-pagamento falhou:",
          e instanceof Error ? e.message : String(e)
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[PagoTIC][Webhook] Erro:", e instanceof Error ? e.message : String(e));
    return res.status(200).json({ ok: true });
  }
}
