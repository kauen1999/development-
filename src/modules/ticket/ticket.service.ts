// src/modules/ticket/ticket.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { generateTicketAssets } from "./ticketGeneration.service";
import crypto from "crypto";

export async function generateAndSaveTicket(orderItemId: string) {
  // check if ticket already exists
  const existing = await prisma.ticket.findUnique({
    where: { orderItemId },
  });
  if (existing) return existing;

  // find orderItem with relations
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        include: {
          EventSession: true,
          user: true,
          Event: true,
        },
      },
      seat: true,
    },
  });

  if (!orderItem) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order item not found" });
  }

  // create ticket with qrId
  const ticket = await prisma.ticket.create({
    data: {
      seatId: orderItem.seatId,
      eventSessionId: orderItem.order.eventSessionId,
      orderItemId: orderItem.id,
      userId: orderItem.order.userId,
      eventId: orderItem.order.eventId,
      qrId: crypto.randomUUID(), // ✅ string UUID
      qrCodeUrl: "",
      pdfUrl: "",
    },
  });

  // generate QR + PDF com base no qrId
  await generateTicketAssets(ticket.id);

  return prisma.ticket.findUnique({ where: { id: ticket.id } });
}

export async function generateTicketsFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
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
  return prisma.ticket.findMany({ where: { orderItemId } });
}

export async function markTicketAsUsedService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { usedAt: new Date() },
  });
}

// nova validação com logs
export async function validateTicketService(
  qrId: string,
  validatorId: string,
  device?: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { qrId }, // ✅ busca por qrId
    include: { event: true, user: true },
  });

  if (!ticket) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
  }
  if (ticket.usedAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket already used." });
  }

  const usedAt = new Date();

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { usedAt, validatorId, device },
  });

  await prisma.validationLog.create({
    data: { ticketId: ticket.id, validatorId, device },
  });

  return {
    status: "valid",
    usedAt: usedAt.toISOString(), // ✅ string
    ticketId: updated.id,
    qrId: updated.qrId, // ✅ string
    eventName: ticket.event.name,
    userEmail: ticket.user.email,
  };
}
