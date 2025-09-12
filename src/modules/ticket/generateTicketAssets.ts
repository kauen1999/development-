import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

/**
 * Marca um ticket como usado a partir do qrId lido no QR Code.
 */
export async function validateTicketService(
  qrId: string,
  validatorId: string,
  device?: string
) {
  // Busca o ticket pelo qrId
  const ticket = await prisma.ticket.findUnique({
    where: { qrId },
    include: { event: true, user: true },
  });

  if (!ticket) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found." });
  }

  // Se já foi usado, rejeita
  if (ticket.usedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ticket already used.",
    });
  }

  // Marca como usado
  const usedAt = new Date();
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { usedAt, validatorId, device },
    include: { event: true, user: true },
  });

  // Cria log de validação
  await prisma.validationLog.create({
    data: { ticketId: ticket.id, validatorId, device },
  });

  return {
    status: "valid",
    usedAt,
    ticketId: updated.id,
    qrId: updated.qrId,
    eventName: updated.event.name,
    userEmail: updated.user.email,
  };
}
