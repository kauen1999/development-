// src/modules/pagotic/pagotic.webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { webhookPayloadSchema } from "./pagotic.schema";
import { normalizePagoticStatus, withTimeout } from "./pagotic.utils";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket, Prisma } from "@prisma/client";

const CMS_NOTIFY_URL = "https://app.cmsargentina.com/acquisition/v2/notify";
const MAX_PAYLOAD_SIZE = 1e6; // ~1MB
const RAW_RESPONSE_LIMIT = 5000; // 5KB

// -------------------------
// CMS Notify com retry/backoff
// -------------------------
async function notifyCms(raw: string, orderId?: string) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(CMS_NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        signal: withTimeout(15000),
      });
      console.log("[PAGOTIC][Webhook] CMS notificado com sucesso");
      return true;
    } catch (err) {
      console.error(`[PAGOTIC][Webhook] CMS falhou (tentativa ${attempt}):`, err);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  console.error("[PAGOTIC][Webhook] CMS falhou permanentemente para order", orderId);
  return false;
}

// -------------------------
// State Machine Guard
// -------------------------
function isValidTransition(current: string, next: string): boolean {
  const allowed: Record<string, string[]> = {
    PENDING: ["PAID", "CANCELLED", "EXPIRED"],
    PAID: [], // não volta
    CANCELLED: [],
    EXPIRED: [],
  };
  return allowed[current]?.includes(next) ?? false;
}

// -------------------------
// Handler
// -------------------------
export async function pagoticWebhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // ✅ ACK imediato SEMPRE
  res.status(200).json({ ok: true });

  (async () => {
    try {
      const rawBody = JSON.stringify(req.body);
      if (rawBody.length > MAX_PAYLOAD_SIZE) {
        console.error("[PAGOTIC][Webhook] Payload muito grande, ignorado");
        return;
      }

      const parse = webhookPayloadSchema.safeParse(req.body);
      if (!parse.success) {
        console.error("[PAGOTIC][Webhook] Payload inválido", parse.error.flatten());
        return;
      }
      const payload = parse.data;

      console.log("[PAGOTIC][Webhook] Payload recebido:", {
        id: payload.id,
        status: payload.status,
        status_detail: payload.status_detail,
        extId: payload.external_transaction_id,
        collector: payload.collector,
      });

      // CMS notify em paralelo
      void notifyCms(rawBody, typeof payload.external_transaction_id === "string" ? payload.external_transaction_id : undefined);

      // Validar collector
      const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
      if (!expectedCollector) {
        console.error("[PAGOTIC][Webhook] Collector esperado não configurado");
        return;
      }
      if (payload.collector && payload.collector !== expectedCollector) {
        console.warn("[PAGOTIC][Webhook] Collector inválido", { got: payload.collector });
        return;
      }

      // Extrair OrderId (garantindo string)
      const extId: string =
        typeof payload.external_transaction_id === "string" ? payload.external_transaction_id : "";
      const orderId: string | undefined = extId.toLowerCase().startsWith("order_") ? extId.slice(6) : undefined;
      if (!orderId) {
        console.warn("[PAGOTIC][Webhook] sem external_transaction_id");
        return;
      }

      // Validar status
      const nextStatus = normalizePagoticStatus(payload.status);
      if (!nextStatus) {
        console.warn("[PAGOTIC][Webhook] Status não reconhecido:", payload.status);
        return;
      }

      // Normalizar detail
      const detail: string =
        typeof payload.status_detail === "string" ? payload.status_detail.trim().toLowerCase() : "";

      // rawResponse truncado
      const safeRaw: string = JSON.stringify(payload).slice(0, RAW_RESPONSE_LIMIT);

      // Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) {
        console.error("[PAGOTIC][Webhook] Order não encontrada:", orderId);
        return;
      }

      // Guard idempotente
      if (order.status === "PAID" && nextStatus === "PAID") {
        console.log("[PAGOTIC][Webhook] Order já paga:", orderId);
        return;
      }
      if (!isValidTransition(order.status, nextStatus)) {
        console.warn("[PAGOTIC][Webhook] Transição inválida", {
          current: order.status,
          next: nextStatus,
        });
        return;
      }

      // ✅ Transação atômica
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: nextStatus,
            externalTransactionId: extId || order.externalTransactionId,
            paymentNumber: (typeof payload.id === "string" && payload.id) || order.paymentNumber,
          },
          include: { user: true, Event: true },
        });

        // PaymentAttempt idempotente
        const paymentId = typeof payload.id === "string" ? payload.id : "";
        if (paymentId) {
          const attemptTag = `${paymentId}:${nextStatus}:${detail}`;
          const exists = await tx.paymentAttempt.findFirst({
            where: { payment: { orderId }, attemptTag },
            select: { id: true },
          });

          if (!exists) {
            await tx.paymentAttempt.create({
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
                      amount: typeof payload.final_amount === "number" ? payload.final_amount : order.total,
                      rawResponse: safeRaw as unknown as Prisma.InputJsonValue,
                    },
                  },
                },
                status:
                  nextStatus === "PAID"
                    ? "APPROVED"
                    : nextStatus === "CANCELLED"
                    ? "FAILED"
                    : "PENDING",
                detail,
                rawResponse: safeRaw as unknown as Prisma.InputJsonValue,
              },
            });
            console.log("[PAGOTIC][Webhook] PaymentAttempt salvo:", {
              orderId,
              status: nextStatus,
            });
          }
        }

        // Pós-pagamento
        if (nextStatus === "PAID") {
          try {
            const ticketsAll = await generateTicketsFromOrder(updated.id);
            const tickets = (ticketsAll as Ticket[]).filter(Boolean);
            console.log("[PAGOTIC][Webhook] Tickets gerados:", tickets.map((t) => t.id));

            if (updated.user?.email) {
              for (let i = 0; i < 3; i++) {
                try {
                  await sendTicketEmail(updated.user, updated.Event, tickets);
                  console.log("[PAGOTIC][Webhook] Email enviado:", updated.user.email);
                  break;
                } catch (err) {
                  if (i === 2) throw err;
                  await new Promise((r) => setTimeout(r, 2000));
                }
              }
            }
          } catch (err) {
            console.error("[PAGOTIC][Webhook] Erro pós-pagamento:", err);
          }
        }
      });
    } catch (e) {
      console.error("[PAGOTIC][Webhook] erro inesperado:", e);
    }
  })();
}
