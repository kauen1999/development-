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
  metadata?: string | Record<string, unknown>;
  payment_number?: string | number | null;
};

function toStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

// Remove o prefixo "order_" se vier no external_transaction_id
function stripOrderPrefix(external: string | undefined) {
  const raw = (external ?? "").trim();
  if (!raw) return { raw: "", orderId: "" };
  const orderId = raw.toLowerCase().startsWith("order_") ? raw.slice(6) : raw;
  return { raw, orderId };
}

function normalizeOrderStatus(s?: string): "PAID" | "PENDING" | "CANCELLED" {
  const x = (s ?? "").trim().toLowerCase();
  if (["approved", "accredited", "paid", "aprobado", "pagado"].includes(x)) return "PAID";
  if (["rejected", "cancelled", "canceled"].includes(x)) return "CANCELLED";
  return "PENDING";
}

async function readRawBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

async function parseNotification(req: NextApiRequest): Promise<PagoTicNotification> {
  const ct = String(req.headers["content-type"] ?? "");
  const raw = await readRawBody(req);

  if (ct.includes("application/x-www-form-urlencoded")) {
    const p = qs.parse(raw);
    return {
      id: toStr(p.id),
      status: toStr(p.status),
      final_amount: p.final_amount ? Number(p.final_amount) : undefined,
      currency: toStr(p.currency),
      collector: toStr(p.collector),
      external_transaction_id: toStr(p.external_transaction_id),
      payment_number: toStr(p.payment_number),
      metadata: toStr(p.metadata) ?? {},
    };
  }

  try {
    return JSON.parse(raw) as PagoTicNotification;
  } catch {
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sempre 200 para evitar storm de retries
  if (req.method !== "POST") return res.status(200).json({ ok: true, method: req.method });

  try {
    const body = await parseNotification(req);

    // (Opcional) Validação do collector
    const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
    if (expectedCollector && body.collector && body.collector !== expectedCollector) {
      console.warn("[PagoTIC] Collector divergente:", { got: body.collector, expected: expectedCollector });
      return res.status(200).json({ ok: true });
    }

    // Resolve orderId sem prefixo e mantém o valor bruto para fallback
    const { raw: externalRaw, orderId } = stripOrderPrefix(body.external_transaction_id);
    if (!externalRaw && !orderId) {
      console.error("[PagoTIC] external_transaction_id ausente.");
      return res.status(200).json({ ok: true });
    }

    // paymentId: usa 'id' ou 'payment_number'
    const paymentId =
      body.id ??
      (typeof body.payment_number === "string"
        ? body.payment_number
        : String(body.payment_number ?? "")) ??
      "";

    const nextStatus = normalizeOrderStatus(body.status);

    // 1) tenta por id (sem prefixo)
    let order =
      orderId
        ? await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true, Event: true },
          })
        : null;

    // 2) fallback por externalTransactionId (valor como veio do gateway)
    if (!order && externalRaw) {
      order = await prisma.order.findFirst({
        where: { externalTransactionId: externalRaw },
        include: { user: true, Event: true },
      });
    }

    if (!order) {
      console.error("[PagoTIC] Order não encontrada. orderId(resolvido)=", orderId, " externalRaw=", externalRaw);
      return res.status(200).json({ ok: true });
    }

    // Idempotência simples
    if (order.status === "PAID" && nextStatus === "PAID") {
      return res.status(200).json({ ok: true, message: "already paid" });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        externalTransactionId: externalRaw || order.externalTransactionId,
        paymentNumber: paymentId || order.paymentNumber,
      },
      include: { user: true, Event: true },
    });

    if (nextStatus === "PAID") {
      try {
        const ticketsAll = await generateTicketsFromOrder(updated.id);
        const tickets = (ticketsAll as Ticket[]).filter(Boolean);
        if (updated.user?.email) {
          await sendTicketEmail(updated.user, updated.Event, tickets);
        }
      } catch (e) {
        console.error("[PagoTIC] Pós-pagamento falhou:", e);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[PagoTIC] Webhook erro:", e);
    return res.status(200).json({ ok: true });
  }
}
