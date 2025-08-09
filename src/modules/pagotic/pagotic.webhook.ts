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
    const payload = req.body;

    if (
      typeof payload !== "object" ||
      !payload.external_transaction_id ||
      !payload.status
    ) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const externalId = String(payload.external_transaction_id);
    const rawStatus = String(payload.status).toUpperCase();

    if (!Object.values(PaymentStatus).includes(rawStatus as PaymentStatus)) {
      return res.status(400).json({ error: "Status inválido no payload" });
    }
    const status = rawStatus as PaymentStatus;

    // extrai orderId da string "order-<orderId>-<timestamp>"
    const parts = externalId.split("-");
    const orderId = parts[1];

    // Atualiza o registro de Payment com o payload bruto
    await prisma.payment.updateMany({
      where: { orderId },
      data: { status, rawResponse: payload },
    });

    // ⬇⬇⬇ COLE/DEIXE ESTE BLOCO AQUI ⬇⬇⬇
    if (status === PaymentStatus.APPROVED) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          event: true,
          orderItems: {
            include: {
              seat: { include: { ticketCategory: true } }, // seat pode ser null (GENERAL)
            },
          },
        },
      });
      if (!order) throw new Error("Pedido não encontrado para gerar ingressos.");

      // SEATED: marca assento como SOLD
      for (const item of order.orderItems) {
        if (item.seat) {
          await prisma.seat.update({
            where: { id: item.seat.id },
            data: { status: "SOLD" },
          });
        }

        // Cria o ticket se ainda não existir
        const exists = await prisma.ticket.count({
          where: { orderItemId: item.id },
        });
        if (exists === 0) {
          const ticket = await prisma.ticket.create({
            data: {
              orderItemId: item.id,
              seatId: item.seat?.id ?? null, // null em GENERAL
              sessionId: order.sessionId,
              userId: order.userId,
              eventId: order.eventId,
              ticketCategoryId:
                item.ticketCategoryId ?? item.seat?.ticketCategoryId ?? null,
              qrCodeUrl: "", // preenchido pelo generateTicketAssets
            },
          });

          await generateTicketAssets(ticket.id);
        }
      }

      // Atualiza status do pedido
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      // Envia e-mail com os tickets
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      if (user) {
        const tickets = await prisma.ticket.findMany({
          where: { orderItem: { orderId: order.id } },
        });

        try {
          const { sendTicketEmail } = await import("@/modules/sendmail/mailer");
          await sendTicketEmail(user, order.event, tickets);
        } catch (e) {
          console.error("Falha ao enviar e-mail de tickets:", e);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[PagoTIC Webhook] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
