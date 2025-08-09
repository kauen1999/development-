// src/pages/api/tickets/validate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { code, validatorId } = req.body as { code?: string; validatorId?: string };
    const device = req.headers["user-agent"] ?? "unknown";

    if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

    // Se seu QR guarda apenas o ID:
    const ticketId = code.startsWith("ticket:") ? code.slice(7) : code;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true, orderItem: true },
    });

    if (!ticket) return res.status(404).json({ ok: false, error: "Ticket not found" });

    if (ticket.usedAt) {
      return res.status(409).json({
        ok: false,
        error: "Ticket already used",
        usedAt: ticket.usedAt,
      });
    }

    // marca como usado
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        usedAt: new Date(),
        validatorId: validatorId ?? null,
        device: String(device),
      },
    });

    // log
    await prisma.validationLog.create({
      data: {
        ticketId: ticket.id,
        validatorId: validatorId ?? null,
        device: String(device),
      },
    });

    return res.status(200).json({
      ok: true,
      ticketId: updated.id,
      event: ticket.event?.name,
      validatedAt: updated.usedAt,
    });
  } catch (e) {
    console.error("[tickets.validate] error:", e);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
