// src/modules/ticket/ticket.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { generateTicketAssets } from "./ticketGeneration.service";
import crypto from "crypto";
import type { Ticket } from "@prisma/client";

// -------------------------
// Gerar um ticket a partir de um OrderItem
// -------------------------
export async function generateAndSaveTicket(orderItemId: string) {
  // Verifica se já existe ticket para esse item
  const existing = await prisma.ticket.findFirst({
    where: { orderItemId },
  });
  if (existing) return existing;

  // Busca o OrderItem com relações necessárias
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

  // Cria ticket inicial com UUID
  const ticket = await prisma.ticket.create({
    data: {
      seatId: orderItem.seatId,
      eventSessionId: orderItem.order.eventSessionId,
      orderItemId: orderItem.id,
      userId: orderItem.order.userId,
      eventId: orderItem.order.eventId,
      qrId: crypto.randomUUID(),
      qrCodeUrl: "",
      pdfUrl: "",
    },
  });

  // Gera QR + PDF baseado no qrId
  await generateTicketAssets(ticket.id);

  return prisma.ticket.findUnique({ where: { id: ticket.id } });
}

// -------------------------
// Gerar todos os tickets de uma Order
// -------------------------
export async function generateTicketsFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });
  if (!order) throw new Error("Order not found");

  // Usa Promise.all para paralelizar a geração
  const tickets = await Promise.all(
    order.orderItems.map((item) => generateAndSaveTicket(item.id))
  );

  // Filtra nulos e retorna apenas tickets válidos
  return tickets.filter((t): t is Ticket => Boolean(t));
}

// -------------------------
// Buscar tickets de um OrderItem
// -------------------------
export async function getTicketsByOrderItemService(orderItemId: string) {
  return prisma.ticket.findMany({ where: { orderItemId } });
}

// -------------------------
// Marcar ticket como usado
// -------------------------
export async function markTicketAsUsedService(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { usedAt: new Date() },
  });
}

// -------------------------
// Validar ticket (entrada)
// -------------------------
export async function validateTicketService(
  qrId: string,
  validatorId: string,
  device?: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { qrId },
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
    usedAt: usedAt.toISOString(),
    ticketId: updated.id,
    qrId: updated.qrId,
    eventName: ticket.event.name,
    userEmail: ticket.user.email,
  };
}
