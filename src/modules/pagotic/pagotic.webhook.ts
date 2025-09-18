// src/modules/pagotic/pagotic.webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma, Ticket } from "@prisma/client";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import { normalizePagoticStatus } from "./pagotic.utils";
import { webhookPayloadSchema } from "./pagotic.schema";

export const config = { api: { bodyParser: false } };

type PagoTicNotification = {
  id?: string;
  payment_id?: string;
  paymentId?: string;
  status?: string;
  status_detail?: string;
  final_amount?: number;
  external_transaction_id?: string;
  payment_number?: string | number | null;
};

// -------------------------
// Helpers
// -------------------------
function resolveOrderIdFromExternal(externalId: string): string {
  return externalId.toLowerCase().startsWith("order_")
    ? externalId.slice(6) // 🔑 remove prefixo
    : externalId;
}

// -------------------------
// Handler
// -------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // ✅ ACK imediato
  res.status(200).json({ ok: true });

  (async () => {
    try {
      const parse = webhookPayloadSchema.safeParse(req.body);
      if (!parse.success) {
        console.error("[PagoTIC][Webhook] Payload inválido:", parse.error.flatten());
        return;
      }
      const payload: PagoTicNotification = parse.data;

      console.log("[PagoTIC][Webhook] Notificação recebida:", {
        id: payload.id,
        status: payload.status,
        status_detail: payload.status_detail,
        ext: payload.external_transaction_id,
        payment_number: payload.payment_number,
      });

      // Extrair orderId (sem prefixo)
      const ext = payload.external_transaction_id ?? "";
      if (!ext) {
        console.warn("[PagoTIC][Webhook] sem external_transaction_id");
        return;
      }
      const orderId = resolveOrderIdFromExternal(ext);

      // Normalizar status
      const nextStatus = normalizePagoticStatus(payload.status);
      const paymentId = payload.id ?? String(payload.payment_number ?? "");

      // Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) {
        console.error("[PagoTIC][Webhook] Order não encontrada:", orderId);
        return;
      }

      // Evitar downgrade ou duplicado
      if (order.status === "PAID" && nextStatus === "PAID") {
        console.log("[PagoTIC][Webhook] Pedido já pago, ignorando:", orderId);
        return;
      }

      // Atualizar pedido
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          externalTransactionId: ext,
          paymentNumber: paymentId || order.paymentNumber,
        },
        include: { user: true, Event: true },
      });

      // Registrar tentativa de pagamento (idempotente)
      if (paymentId) {
        const attemptTag = `${paymentId}:${nextStatus}:${payload.status_detail ?? ""}`;
        const exists = await prisma.paymentAttempt.findFirst({
          where: { payment: { orderId }, attemptTag },
          select: { id: true },
        });

        if (!exists) {
          await prisma.paymentAttempt.create({
            data: {
              attemptTag,
              payment: {
                connectOrCreate: {
                  where: { orderId },
                  create: {
                    orderId,
                    provider: "PAGOTIC",
                    status:
                      nextStatus === "PAID"
                        ? "APPROVED"
                        : nextStatus === "CANCELLED"
                        ? "FAILED"
                        : "PENDING",
                    amount:
                      typeof payload.final_amount === "number"
                        ? payload.final_amount
                        : order.total,
                    rawResponse: payload as Prisma.InputJsonValue,
                  },
                },
              },
              status:
                nextStatus === "PAID"
                  ? "APPROVED"
                  : nextStatus === "CANCELLED"
                  ? "FAILED"
                  : "PENDING",
              detail: payload.status_detail ?? null,
              rawResponse: payload as Prisma.InputJsonValue,
            },
          });
          console.log("[PagoTIC][Webhook] PaymentAttempt salvo:", {
            orderId,
            status: nextStatus,
          });
        }
      }

      // Pós-pagamento → gera tickets e envia email
      if (nextStatus === "PAID") {
        try {
          const ticketsAll = await generateTicketsFromOrder(updated.id);
          const tickets = (ticketsAll as Ticket[]).filter(Boolean);
          console.log("[PagoTIC][Webhook] Tickets gerados:", tickets.map((t) => t.id));

          if (updated.user?.email) {
            await sendTicketEmail(updated.user, updated.Event, tickets);
            console.log("[PagoTIC][Webhook] Email enviado:", updated.user.email);
          }
        } catch (err) {
          console.error("[PagoTIC][Webhook] Erro pós-pagamento:", err);
        }
      }
    } catch (err) {
      console.error("[PagoTIC][Webhook] Erro inesperado:", err);
    }
  })();
}
