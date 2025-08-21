import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { webhookPayloadSchema } from "@/modules/pagotic/pagotic.schema";
import { isOrderExpired } from "@/modules/order/order.utils";
import { OrderStatus } from "@prisma/client";
import { toOrderDTO } from "@/modules/order/order.mappers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parse = webhookPayloadSchema.safeParse(req.body);
  if (!parse.success) {
    console.error("[PAGOTIC][WEBHOOK] Invalid payload", parse.error.flatten());
    return res.status(200).json({ ok: true });
  }

  const payload = parse.data;
  const paymentId = payload.id;
  const status = payload.status as string;

  try {
    const order = await prisma.order.findFirst({ where: { paymentNumber: paymentId } });
    if (!order) {
      console.warn("[PAGOTIC][WEBHOOK] Order not found for payment", paymentId);
      return res.status(200).json({ ok: true });
    }

    const finalized: OrderStatus[] = [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED];
    if (finalized.includes(order.status)) {
      return res.status(200).json({ ok: true });
    }

    let newStatus: OrderStatus | null = null;
    switch (status) {
      case "approved":
        newStatus = OrderStatus.PAID;
        break;
      case "rejected":
      case "cancelled":
      case "refunded":
        newStatus = OrderStatus.CANCELLED;
        break;
      case "pending":
      case "issued":
      case "in_process":
        if (isOrderExpired(toOrderDTO(order))) {
          newStatus = OrderStatus.EXPIRED;
        }
        break;
      default:
        console.warn("[PAGOTIC][WEBHOOK] Unhandled status", status);
        break;
    }

    if (newStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      if (newStatus === OrderStatus.PAID) {
        console.log(`[PAGOTIC][WEBHOOK] Generating tickets for order ${order.id}`);
        // await generateTicketsForOrder(order.id);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[PAGOTIC][WEBHOOK] Processing error", e);
    return res.status(200).json({ ok: true });
  }
}
