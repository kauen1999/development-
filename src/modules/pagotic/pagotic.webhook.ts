import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketAssets } from "@/modules/ticket/ticketGeneration.service";

export default async function handlePagoTICWebhook(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const payload = req.body;
    const externalId = payload.external_transaction_id;
    const status = payload.status;

    await prisma.payment.updateMany({
      where: { order: { id: externalId } },
      data: {
        status: status.toUpperCase(),
        rawResponse: payload,
      },
    });

    // Quando aprovado, gerar tickets automaticamente
    if (status === "approved") {
      const order = await prisma.order.findUnique({
        where: { id: externalId },
        include: {
          items: {
            include: {
              TicketCategory: true,
            },
          },
        },
      });

      if (!order) throw new Error("Pedido não encontrado para gerar ingressos");

      for (const item of order.items) {
        const ticketsExist = await prisma.ticket.count({
          where: { orderItemId: item.id },
        });

        if (ticketsExist >= item.quantity) continue;

        const ticketsToCreate = item.quantity - ticketsExist;

        await prisma.ticket.createMany({
          data: Array.from({ length: ticketsToCreate }, () => ({
            orderItemId: item.id,
            qrCodeUrl: "",
          })),
        });

        const tickets = await prisma.ticket.findMany({
          where: { orderItemId: item.id },
        });

        for (const ticket of tickets) {
          await generateTicketAssets(ticket.id);
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
    }

    res.status(200).end();
  } catch (error) {
    console.error("[PagoTIC Webhook] Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
