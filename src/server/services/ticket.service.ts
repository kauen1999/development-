import { prisma } from "../db/client";
import { TRPCError } from "@trpc/server";
import { generateTicketAssets } from "./ticket/ticketGeneration.service";

export async function generateAndSaveTicket(orderItemId: string, orderId: string, userName?: string) {
  const assets = await generateTicketAssets({ orderId, userName });

  return prisma.ticket.create({
    data: {
      orderItemId,
      qrCodeUrl: assets.qrCodeUrl,
      pdfUrl: assets.pdfUrl,
      walletPassUrl: assets.walletPassUrl,
    },
  });
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
      qrCodeUrl: {
        contains: qrCodeId,
      },
    },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              event: true,
              user: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ticket não encontrado." });
  }

  if (ticket.usedAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket já utilizado." });
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { usedAt: new Date() },
  });

  return {
    status: "valid",
    usedAt: new Date(),
    ticketId: ticket.id,
    eventName: ticket.orderItem.order.event.name,
    userEmail: ticket.orderItem.order.user.email,
  };
}
