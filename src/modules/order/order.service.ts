// src/modules/order/order.service.ts
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "./order.schema";

export async function createOrderService(input: CreateOrderInput, userId: string) {
  const { eventId, items } = input;

  let total = 0;

  // Validação e cálculo do total
  for (const item of items) {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: item.ticketCategoryId },
    });
    if (!category) throw new Error("Ticket category not found");
    if (category.stock < item.quantity) throw new Error("Not enough tickets available");

    total += category.price * item.quantity;
  }

  // Criação do pedido e dos itens
  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      total,
      items: {
        create: items.map((item) => ({
          quantity: item.quantity,
          price: 0, // atualizado depois
          category: {
            connect: { id: item.categoryId },
          },
          TicketCategory: {
            connect: { id: item.ticketCategoryId },
          },
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // Atualização dos preços e estoque
  for (const item of order.items) {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: item.ticketCategoryId },
    });
    if (category) {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { price: category.price },
      });
      await prisma.ticketCategory.update({
        where: { id: category.id },
        data: { stock: category.stock - item.quantity },
      });
    }
  }

  return order;
}
