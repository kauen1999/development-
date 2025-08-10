// src/pages/api/test/payment-confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";

/**
 * Endpoint de teste para confirmar pagamento e enviar ingressos.
 * Apenas para ambiente de desenvolvimento/homologação.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "Parâmetro orderId é obrigatório" });
    }

    // Atualiza status para "PAID" e busca informações necessárias
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
      include: {
        user: true,
        event: true,
        orderItems: true,
      },
    });

    if (!order.user?.email) {
      return res.status(400).json({ error: "Usuário não possui e-mail cadastrado" });
    }

    // Gera ingressos (QR Code + PDF)
    const tickets = await generateTicketsFromOrder(order.id);

    // Envia os ingressos por e-mail
    await sendTicketEmail(order.user, order.event, tickets);

    return res.status(200).json({
      message: "Pagamento confirmado, ingressos gerados e enviados por e-mail",
      orderId: order.id,
      email: order.user.email,
      tickets: tickets.map((t) => ({
        id: t.id,
        qrCodeUrl: t.qrCodeUrl,
        pdfUrl: t.pdfUrl,
      })),
    });
  } catch (err) {
    console.error(" Erro no teste de confirmação de pagamento:", err);
    return res.status(500).json({ error: "Erro interno", details: (err as Error).message });
  }
}
