// src/modules/ticket/ticket.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { generateTicketAssets } from "./ticketGeneration.service";

// Gera e salva um ingresso individual com assets (QR, PDF)
export async function generateAndSaveTicket(
  orderItemId: string
) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        include: {
          session: true,
          user: true,
          event: true,
        },
      },
      seat: true,
    },
  });

  if (!orderItem) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Order item not found",
    });
  }

  const ticket = await prisma.ticket.create({
    data: {
      seatId: orderItem.seatId,
      sessionId: orderItem.order.sessionId,
      orderItemId: orderItem.id,
      userId: orderItem.order.userId,
      eventId: orderItem.order.eventId,
      qrCodeUrl: "", // será atualizado depois
    },
  });

  const assets = await generateTicketAssets(ticket.id);

  return prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: assets.qrCodeUrl,
      pdfUrl: assets.pdfUrl,
    },
  });
}

// Gera múltiplos ingressos a partir de um pedido (1 por assento = 1 por orderItem)
export async function generateTicketsFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
    },
  });

  if (!order) throw new Error("Order not found");

  const tickets = [];

  for (const item of order.orderItems) {
    const ticket = await generateAndSaveTicket(item.id);
    tickets.push(ticket);
  }

  return tickets;
}

// Busca todos os ingressos vinculados a um orderItem
export async function getTicketsByOrderItemService(orderItemId: string) {
  return prisma.ticket.findMany({
    where: { orderItemId },
  });
}

// Marca ingresso como usado (para controle de entrada)
export async function markTicketAsUsedService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { usedAt: new Date() },
  });
}

// Validação pública via QR Code (entrada do evento)
export async function validateTicketByQrService(qrCodeId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      qrCodeUrl: { contains: qrCodeId },
    },
    include: {
      event: true,
      user: true,
    },
  });

  if (!ticket) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ticket not found.",
    });
  }

  if (ticket.usedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ticket has already been used.",
    });
  }

  const usedAt = new Date();

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { usedAt },
  });

  return {
    status: "valid",
    usedAt,
    ticketId: ticket.id,
    eventName: ticket.event.name,
    userEmail: ticket.user.email,
  };
}
