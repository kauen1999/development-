// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";

// Aceita até 1mb e mantém o bodyParser padrão (JSON/x-www-form-urlencoded)
export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

// Converte valores variados para string
function toStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

// Extrai o orderId que você enviou no createPayment (ex.: "order_<id>")
function resolveOrderIdFromExternal(externalId: string): string {
  const m = externalId.match(/^order_([a-z0-9_-]+)$/i);
  return m?.[1] ?? externalId;
}

// Payload “mínimo” que o PagoTIC costuma enviar.
// Obs: diferentes tenants podem incluir mais campos — usamos .passthrough no parse manual abaixo.
type PagoTicNotification = {
  id?: string;                         // <- identificador do pagamento no PagoTIC (USAR ESTE)
  status?: string;                     // approved | pending | rejected | cancelled | ...
  final_amount?: number;
  currency?: string;
  collector?: string;                  // deve bater com PAGOTIC_COLLECTOR_ID (se usar esse guard)
  external_transaction_id?: string;    // aqui vem o "order_<id>" que você mandou
  metadata?: unknown;
  // Alguns ambientes podem mandar payment_number, mas não confie; use "id"
  payment_number?: string | number | null;
};

// Normaliza status heterogêneos para o enum do Prisma
function normalizeOrderStatus(statusRaw: string | undefined): "PAID" | "PENDING" | "CANCELLED" {
  const s = (statusRaw ?? "").trim().toLowerCase();

  // aprovados (variações)
  const approved = new Set(["approved", "accredited", "paid", "aprobado", "pagado"]);
  if (approved.has(s)) return "PAID";

  // rejeitados/cancelados
  const cancelled = new Set(["rejected", "cancelled", "canceled"]);
  if (cancelled.has(s)) return "CANCELLED";

  // default
  return "PENDING";
}

// Tolerante a JSON e x-www-form-urlencoded
function parseNotification(req: NextApiRequest): PagoTicNotification {
  const ct = String(req.headers["content-type"] ?? "");
  if (ct.includes("application/x-www-form-urlencoded")) {
    // Next já parseia para objeto; garantimos strings
    const raw = req.body as Record<string, unknown>;
    const obj: PagoTicNotification = {
      id: toStr(raw.id),
      status: toStr(raw.status),
      final_amount: typeof raw.final_amount === "string" ? Number(raw.final_amount) : (raw.final_amount as number | undefined),
      currency: toStr(raw.currency),
      collector: toStr(raw.collector),
      external_transaction_id: toStr(raw.external_transaction_id),
      payment_number: raw.payment_number as string | number | null | undefined,
      metadata: raw.metadata,
    };
    return obj;
  }
  // JSON
  return req.body as PagoTicNotification;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = parseNotification(req);

    // Guard opcional por collector
    if (process.env.PAGOTIC_COLLECTOR_ID) {
      const collector = toStr(body.collector);
      if (collector && collector !== process.env.PAGOTIC_COLLECTOR_ID) {
        // 200 para não gerar tempestade de retries
        console.warn("[PagoTIC][Webhook] Collector inválido:", { got: collector, expected: process.env.PAGOTIC_COLLECTOR_ID });
        return res.status(200).json({ ok: true });
      }
    }

    // Precisamos do external_transaction_id para localizar a Order
    const ext = toStr(body.external_transaction_id);
    if (!ext) {
      console.error("[PagoTIC][Webhook] external_transaction_id ausente no payload");
      return res.status(200).json({ ok: true });
    }
    const orderId = resolveOrderIdFromExternal(ext);

    // Normaliza status para enum do Prisma
    const nextStatus = normalizeOrderStatus(body.status);

    // Captura o "id" do pagamento (identificador verdadeiro na PagoTIC)
    const paymentId = toStr(body.id);

    // Busca a Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, event: true },
    });
    if (!order) {
      console.error("[PagoTIC][Webhook] Order não encontrada:", orderId);
      return res.status(200).json({ ok: true });
    }

    // Idempotência: se já está pago e o payload também é aprovado, finalize cedo
    if (order.status === "PAID" && nextStatus === "PAID") {
      return res.status(200).json({ ok: true, message: "Already PAID" });
    }

    // Atualiza espelhos + status (não sobrescreve info se ausente)
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        externalTransactionId: ext,
        // ⚠️ AQUI O AJUSTE PRINCIPAL: usar "id" do provedor como número/identificador
        paymentNumber: paymentId ?? order.paymentNumber,
      },
      include: { user: true, event: true },
    });

    // Se APROVADO → gerar tickets (idempotente no teu serviço) + e‑mail
    if (nextStatus === "PAID") {
      try {
        // Gera tickets (o serviço deve ser idempotente para não duplicar)
        const ticketsRaw = await generateTicketsFromOrder(updated.id);
        const tickets = (ticketsRaw as Array<Ticket | null>).filter((t): t is Ticket => !!t);

        if (updated.user?.email) {
          await sendTicketEmail(updated.user, updated.event, tickets);
        }
      } catch (e) {
        // Não falhe o webhook por causa de e‑mail/geração (idempotência + logs)
        console.error("[PagoTIC][Webhook] Pós-pagamento (tickets/email) falhou:", (e as Error).message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    // Responda 200 para evitar retry storm; registre para análise
    console.error("[PagoTIC][Webhook] Erro:", (e as Error).message);
    return res.status(200).json({ ok: true });
  }
}
