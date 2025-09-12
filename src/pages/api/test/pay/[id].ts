// src/pages/api/test/pay/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ ok: false, error: "Order id is required" });
  }

  try {
    // Busca o pedido
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, Event: true },
    });

    if (!order) {
      return res.status(404).json({ ok: false, error: "Order not found" });
    }

    // Atualiza status para PAID
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "PAID",
        externalTransactionId: `test_${id}`,
        paymentNumber: `TEST-${Date.now()}`,
      },
      include: { user: true, Event: true },
    });

    // Gera ingressos
    const ticketsAll = await generateTicketsFromOrder(updated.id);
    const tickets = (ticketsAll as Ticket[]).filter((t) => Boolean(t));

    // Envia email
    if (updated.user?.email) {
      await sendTicketEmail(updated.user, updated.Event, tickets);
    }

    return res.status(200).json({
      ok: true,
      message: "Simulação concluída, ingressos gerados",
      order: updated,
      tickets,
    });
  } catch (e) {
    console.error("[TestWebhook] Error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
//http://localhost:3000/api/test/pay/<orderId>
