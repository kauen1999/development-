// src/jobs/cleanupExpiredOrders.ts
import { prisma } from "@/lib/prisma";
import { OrderStatus, SeatStatus } from "@prisma/client";

export async function cleanupExpiredOrders() {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    include: { orderItems: { include: { seat: true } } },
  });

  for (const order of expiredOrders) {
    for (const item of order.orderItems) {
      if (item.seat) {
        await prisma.seat.update({
          where: { id: item.seat.id },
          data: { status: SeatStatus.AVAILABLE, userId: null },
        });
      }
    }
  }

  await prisma.order.deleteMany({
    where: { id: { in: expiredOrders.map((o) => o.id) } },
  });

  console.log(`🧹 ${expiredOrders.length} pedidos expirados removidos.`);
}

