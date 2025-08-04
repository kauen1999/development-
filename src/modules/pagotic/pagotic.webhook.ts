// src/modules/pagotic/pagotic.webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketAssets } from "@/modules/ticket/ticketGeneration.service";
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

    const externalId = payload.external_transaction_id as string;
    const rawStatus = String(payload.status).toUpperCase();

    if (!Object.values(PaymentStatus).includes(rawStatus as PaymentStatus)) {
      return res.status(400).json({ error: "Status inválido no payload" });
    }

    const status = rawStatus as PaymentStatus;

    // extrai o orderId da string "order-<orderId>-<timestamp>"
    const parts = externalId.split("-");
    const orderId = parts[1];

    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status,
        rawResponse: payload,
      },
    });

    if (status === "APPROVED") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              seat: {
                include: {
                  ticketCategory: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado para gerar ingressos.");
      }

      for (const item of order.orderItems) {
        // Cria Seat se ainda não existe
        const existingSeat = await prisma.seat.findUnique({
          where: { id: item.seat.id },
        });

        if (!existingSeat) {
          await prisma.seat.create({
            data: {
              id: item.seat.id,
              label: item.seat.label,
              row: item.seat.row,
              number: item.seat.number,
              status: "SOLD",
              userId: item.seat.userId,
              eventId: item.seat.eventId,
              sessionId: item.seat.sessionId,
              ticketCategoryId: item.seat.ticketCategoryId,
            },
          });
        } else {
          await prisma.seat.update({
            where: { id: item.seat.id },
            data: { status: "SOLD" },
          });
        }

        // Cria o Ticket (caso ainda não exista)
        const existing = await prisma.ticket.count({
          where: { orderItemId: item.id },
        });

        if (existing === 0) {
          const ticket = await prisma.ticket.create({
            data: {
              orderItemId: item.id,
              seatId: item.seat.id,
              sessionId: item.seat.sessionId,
              userId: item.seat.userId,
              eventId: item.seat.eventId,
              qrCodeUrl: "",
            },
          });

          await generateTicketAssets(ticket.id);
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      // Verifica se o evento esgotou
      const totalSold = await prisma.seat.count({
        where: {
          eventId: order.eventId,
          status: "SOLD",
        },
      });

      const event = await prisma.event.findUnique({
        where: { id: order.eventId },
      });

      if (event && totalSold >= event.capacity) {
        await prisma.event.update({
          where: { id: event.id },
          data: { status: "SOLD_OUT" },
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[PagoTIC Webhook] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
