// src/pages/api/validate/[ticketId].ts
import { prisma } from "@/server/db/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getServerAuthSessionApi } from "@/server/nextauth.session-helper";

const ticketIdSchema = z.string().cuid("Invalid ticket ID format (expected CUID)");
const deviceSchema = z.string().min(3).max(100);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerAuthSessionApi(req, res);

  if (!session || session.user.role !== "ADMIN") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ticketId = req.query.ticketId as string;
  const device = req.body.device;

  const ticketParse = ticketIdSchema.safeParse(ticketId);
  const deviceParse = deviceSchema.safeParse(device);

  if (!ticketParse.success) {
    return res.status(400).json({ message: "Invalid ticket ID" });
  }

  if (!deviceParse.success) {
    return res.status(400).json({ message: "Invalid device identifier" });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              user: true,
              event: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ valid: false, message: "Ticket not found" });
  }

  if (ticket.usedAt) {
    return res.status(200).json({
      valid: false,
      message: "Ticket already used",
      usedAt: ticket.usedAt,
    });
  }

  const now = new Date();

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      usedAt: now,
      validatedById: session.user.id,
      device: device,
    },
  });

  return res.status(200).json({
    valid: true,
    ticketId,
    usedAt: now,
    device,
    validatedById: session.user.id,
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
