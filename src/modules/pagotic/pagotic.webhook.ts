// src/modules/pagotic/pagotic.webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { webhookPayloadSchema } from "./pagotic.schema";
import { normalizePagoticStatus, withTimeout } from "./pagotic.utils";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket, Prisma } from "@prisma/client";

const CMS_NOTIFY_URL = "https://app.cmsargentina.com/acquisition/v2/notify";

async function notifyCms(raw: string) {
  try {
    await fetch(CMS_NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
      signal: withTimeout(30000),
    });
    console.log("[PAGOTIC][Webhook] Notificação enviada ao CMS");
  } catch (err) {
    console.error("[PAGOTIC][Webhook] Falha ao notificar CMS:", err);
  }
}

export async function pagoticWebhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // ✅ responde imediatamente
  res.status(200).json({ ok: true });

  (async () => {
    try {
      const rawBody = JSON.stringify(req.body);
      const parse = webhookPayloadSchema.safeParse(req.body);

      if (!parse.success) {
        console.error("[PAGOTIC][Webhook] payload inválido", parse.error.flatten());
        return;
      }

      const payload = parse.data;

      // 🔹 Corrige erro do TS
      const extId =
        typeof payload.external_transaction_id === "string"
          ? payload.external_transaction_id
          : "";
      const orderId = extId.toLowerCase().startsWith("order_") ? extId.slice(6) : undefined;

      if (!orderId) {
        console.warn("[PAGOTIC][Webhook] sem external_transaction_id");
        return;
      }

      const nextStatus = normalizePagoticStatus(payload.status);

      console.log("[PAGOTIC][Webhook] Processando:", {
        orderId,
        statusRaw: payload.status,
        nextStatus,
      });

      // Busca order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) {
        console.error("[PAGOTIC][Webhook] Order não encontrada:", orderId);
        return;
      }

      // Atualiza status
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          externalTransactionId: extId || order.externalTransactionId,
          paymentNumber: payload.id ?? order.paymentNumber,
        },
        include: { user: true, Event: true },
      });

      // Registra PaymentAttempt
      try {
        await prisma.paymentAttempt.create({
          data: {
            payment: {
              connectOrCreate: {
                where: { orderId: orderId },
                create: {
                  orderId,
                  provider: "PAGOTIC",
                  status:
                    nextStatus === "PAID"
                      ? "APPROVED"
                      : nextStatus === "CANCELLED"
                      ? "FAILED"
                      : "PENDING",
                  amount: payload.final_amount ?? order.total,
                  rawResponse: payload as unknown as Prisma.InputJsonValue, // ✅ corrigido
                },
              },
            },
            status:
              nextStatus === "PAID"
                ? "APPROVED"
                : nextStatus === "CANCELLED"
                ? "FAILED"
                : "PENDING",
            detail: payload.status ?? null,
            rawResponse: payload as unknown as Prisma.InputJsonValue, // ✅ corrigido
          },
        });
        console.log("[PAGOTIC][Webhook] PaymentAttempt salvo:", {
          orderId,
          status: nextStatus,
        });
      } catch (err) {
        console.error("[PAGOTIC][Webhook] Falha ao salvar PaymentAttempt:", err);
      }

      // Se pago → gera tickets e envia email
      if (nextStatus === "PAID") {
        try {
          const ticketsAll = await generateTicketsFromOrder(updated.id);
          const tickets = (ticketsAll as Ticket[]).filter(Boolean);
          console.log("[PAGOTIC][Webhook] Tickets gerados:", tickets.map((t) => t.id));
          if (updated.user?.email) {
            await sendTicketEmail(updated.user, updated.Event, tickets);
            console.log("[PAGOTIC][Webhook] Email enviado:", updated.user.email);
          }
        } catch (err) {
          console.error("[PAGOTIC][Webhook] Erro pós-pagamento:", err);
        }
      }

      // 🔹 Só agora envia para o CMS
      await notifyCms(rawBody);
    } catch (e) {
      console.error("[PAGOTIC][Webhook] erro inesperado:", e);
    }
  })();
}
