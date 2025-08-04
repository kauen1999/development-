// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { createTicketsForOrder } from "@/modules/ticket/ticketGeneration.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const payload = req.body;

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.external_transaction_id !== "string" ||
    typeof payload.status !== "string"
  ) {
    console.warn("[PagoTIC Webhook] Payload inválido:", payload);
    return res.status(400).json({ message: "Invalid payload" });
  }

  const externalId = payload.external_transaction_id;
  const status = payload.status.toLowerCase();

  try {
    const order = await prisma.order.findFirst({
      where: { externalTransactionId: externalId },
      include: {
        user: true,
        orderItems: {
          include: { seat: true },
        },
      },
    });

    if (!order) {
      console.error("[PagoTIC Webhook] Pedido não encontrado:", externalId);
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "approved") {
      if (order.status === "PAID") {
        console.log("[PagoTIC Webhook] Pedido já processado:", order.id);
        return res.status(200).json({ message: "Already processed" });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      await createTicketsForOrder(order);
      console.log("[PagoTIC Webhook] Pagamento aprovado e ingressos criados:", order.id);
    } else if (status === "rejected") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      console.log("[PagoTIC Webhook] Pagamento rejeitado:", order.id);
    } else {
      console.log("[PagoTIC Webhook] Status não tratado:", status);
    }

    return res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    console.error("[PagoTIC Webhook] Erro interno:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
