import { prisma } from "@/server/db/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ticketId = req.query.ticketId as string;

  if (!ticketId) {
    return res.status(400).json({ message: "Ticket ID ausente" });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      orderItem: {
        include: {
          order: {
            include: { user: true, event: true },
          },
        },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ valid: false, message: "Ticket não encontrado" });
  }

  if (ticket.usedAt) {
    return res.status(200).json({
      valid: false,
      message: "Ingresso já utilizado",
      usedAt: ticket.usedAt,
    });
  }

  // Validação OK
  return res.status(200).json({
    valid: true,
    ticketId,
    user: {
      name: ticket.orderItem.order.user.name,
      email: ticket.orderItem.order.user.email,
    },
    event: {
      name: ticket.orderItem.order.event.name,
      date: ticket.orderItem.order.event.date,
    },
  });
}
