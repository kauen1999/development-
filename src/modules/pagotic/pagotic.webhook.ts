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

    // validação básica
    if (
      typeof payload !== "object" ||
      !payload?.external_transaction_id ||
      !payload?.status
    ) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const externalId = String(payload.external_transaction_id);
    const rawStatus = String(payload.status).toUpperCase();

    if (!Object.values(PaymentStatus).includes(rawStatus as PaymentStatus)) {
      return res.status(400).json({ error: "Status inválido no payload" });
    }
    const status = rawStatus as PaymentStatus;

    // extrai o orderId de "order-<orderId>-<timestamp>-<rand>"
    const parts = externalId.split("-");
    const orderId = parts.length >= 3 ? parts[1] : undefined;
    if (!orderId) {
      return res.status(400).json({ error: "external_transaction_id sem orderId" });
    }

    // Atualiza o registro de pagamento do pedido
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status,
        rawResponse: payload,
      },
    });

    // Processa aprovação
    if (status === "APPROVED") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          event: { select: { id: true, capacity: true } },
          orderItems: {
            include: {
              // SEATED
              seat: {
                include: { ticketCategory: true },
              },
              // GENERAL
              ticketCategory: true,
            },
          },
        },
      });

      if (!order) {
        // Não dá pra seguir sem o pedido
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      // Para cada item, cria ticket conforme o tipo
      for (const item of order.orderItems) {
        if (item.seat) {
          // SEATED: garante assento SOLD e gera ticket atrelado ao assento
          await prisma.seat.updateMany({
            where: { id: item.seat.id },
            data: { status: "SOLD" },
          });

          // Evita duplicar ticket
          const exists = await prisma.ticket.count({
            where: { orderItemId: item.id },
          });

          if (exists === 0) {
            const ticket = await prisma.ticket.create({
              data: {
                orderItemId: item.id,
                seatId: item.seat.id,
                sessionId: item.seat.sessionId,
                userId: order.userId, // comprador
                eventId: item.seat.eventId,
                ticketCategoryId: item.seat.ticketCategoryId, // opcional mas útil
                qrCodeUrl: "",
              },
            });

            await generateTicketAssets(ticket.id);
          }
        } else {
          // GENERAL: cria ticket SEM assento, referenciando a categoria
          if (!item.ticketCategoryId || !item.ticketCategory) {
            // se por algum motivo faltar categoria, pula com log
            // eslint-disable-next-line no-console
            console.warn(
              "[PagoTIC Webhook] OrderItem sem ticketCategoryId em evento GENERAL:",
              item.id
            );
            continue;
          }

          const exists = await prisma.ticket.count({
            where: { orderItemId: item.id },
          });

          if (exists === 0) {
            const ticket = await prisma.ticket.create({
              data: {
                orderItemId: item.id,
                seatId: null, // sem assento
                sessionId: order.sessionId,
                userId: order.userId, // comprador
                eventId: order.eventId,
                ticketCategoryId: item.ticketCategoryId,
                qrCodeUrl: "",
              },
            });

            await generateTicketAssets(ticket.id);
          }
        }
      }

      // marca o pedido como pago
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      // Regra de SOLD_OUT: considera TODOS os tickets emitidos do evento
      const totalIssuedTickets = await prisma.ticket.count({
        where: { eventId: order.eventId },
      });

      const eventCap = order.event.capacity;
      if (totalIssuedTickets >= eventCap) {
        await prisma.event.update({
          where: { id: order.eventId },
          data: { status: "SOLD_OUT" },
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[PagoTIC Webhook] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
