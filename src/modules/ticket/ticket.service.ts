// src/modules/ticket/ticket.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { generateTicketAssets } from "./ticketGeneration.service";

export async function generateAndSaveTicket(orderItemId: string) {
  // Evita duplicado: verifica se já existe ticket para este orderItem
  const existing = await prisma.ticket.findUnique({
    where: { orderItemId },
  });

  if (existing) {
    return existing;
  }

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        include: {
          eventSession: true, 
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

  // Cria ticket sem URLs
  const ticket = await prisma.ticket.create({
    data: {
      seatId: orderItem.seatId,
      eventSessionId: orderItem.order.eventSessionId, 
      orderItemId: orderItem.id,
      userId: orderItem.order.userId,
      eventId: orderItem.order.eventId,
      qrCodeUrl: "",
      pdfUrl: "",
    },
  });

  // Gera e atualiza assets
  await generateTicketAssets(ticket.id);

  // Retorna ticket atualizado com URLs
  return prisma.ticket.findUnique({ where: { id: ticket.id } });
}

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

export async function getTicketsByOrderItemService(orderItemId: string) {
  return prisma.ticket.findMany({
    where: { orderItemId },
  });
}

export async function markTicketAsUsedService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { usedAt: new Date() },
  });
}

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
