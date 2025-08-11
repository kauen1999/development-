// src/modules/pagotic/pagotic.webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketAssets } from "@/modules/ticket/generateTicketAssets";
import { PaymentStatus } from "@prisma/client";

export default async function handlePagoTICWebhook(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 🔹 Log inicial da requisição
    console.log("=== [PagoTIC Webhook] Requisição recebida ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const payload = req.body;

    if (
      typeof payload !== "object" ||
      !payload.external_transaction_id ||
      !payload.status
    ) {
      console.error("[PagoTIC Webhook] Payload inválido:", payload);
      return res.status(400).json({ error: "Payload inválido" });
    }

    const externalId = String(payload.external_transaction_id);
    const rawStatus = String(payload.status).toUpperCase();

    if (!Object.values(PaymentStatus).includes(rawStatus as PaymentStatus)) {
      console.error("[PagoTIC Webhook] Status inválido:", rawStatus);
      return res.status(400).json({ error: "Status inválido no payload" });
    }
    const status = rawStatus as PaymentStatus;

    // 🔹 Extrai orderId da string "order-<orderId>-<timestamp>"
    const parts = externalId.split("-");
    const orderId = parts[1];
    console.log(`[PagoTIC Webhook] orderId extraído: ${orderId}`);

    // 🔹 Atualiza o registro de Payment com o payload bruto
    const paymentUpdate = await prisma.payment.updateMany({
      where: { orderId },
      data: { status, rawResponse: payload },
    });
    console.log(
      `[PagoTIC Webhook] Pagamentos atualizados: ${paymentUpdate.count} registro(s) alterado(s)`
    );

    // 🔹 Se aprovado, processa criação de tickets
    if (status === PaymentStatus.APPROVED) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          event: true,
          orderItems: {
            include: {
              seat: { include: { ticketCategory: true } },
            },
          },
        },
      });

      if (!order) {
        console.error("[PagoTIC Webhook] Pedido não encontrado para gerar ingressos");
        throw new Error("Pedido não encontrado para gerar ingressos.");
      }

      console.log(`[PagoTIC Webhook] Pedido ${order.id} encontrado, gerando tickets...`);

      for (const item of order.orderItems) {
        if (item.seat) {
          await prisma.seat.update({
            where: { id: item.seat.id },
            data: { status: "SOLD" },
          });
          console.log(`[PagoTIC Webhook] Assento ${item.seat.id} marcado como SOLD`);
        }

        const exists = await prisma.ticket.count({
          where: { orderItemId: item.id },
        });
        if (exists === 0) {
          const ticket = await prisma.ticket.create({
            data: {
              orderItemId: item.id,
              seatId: item.seat?.id ?? null,
              eventSessionId: order.eventSessionId,
              userId: order.userId,
              eventId: order.eventId,
              ticketCategoryId:
                item.ticketCategoryId ?? item.seat?.ticketCategoryId ?? null,
              qrCodeUrl: "",
            },
          });
          console.log(`[PagoTIC Webhook] Ticket ${ticket.id} criado`);

          await generateTicketAssets(ticket.id);
          console.log(`[PagoTIC Webhook] Assets do ticket ${ticket.id} gerados`);
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
      console.log(`[PagoTIC Webhook] Pedido ${order.id} atualizado para status PAID`);

      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      if (user) {
        const tickets = await prisma.ticket.findMany({
          where: { orderItem: { orderId: order.id } },
        });

        try {
          const { sendTicketEmail } = await import("@/modules/sendmail/mailer");
          await sendTicketEmail(user, order.event, tickets);
          console.log(`[PagoTIC Webhook] E-mail com tickets enviado para ${user.email}`);
        } catch (e) {
          console.error("[PagoTIC Webhook] Falha ao enviar e-mail de tickets:", e);
        }
      }
    }

    console.log("=== [PagoTIC Webhook] Processamento concluído com sucesso ===");
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[PagoTIC Webhook] Erro geral:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
