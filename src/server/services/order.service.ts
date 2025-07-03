import { prisma } from "../db/client";
import type { CreateOrderInput } from "../schema/order.schema";

export const createOrderService = async (
  input: CreateOrderInput,
  userId: string
) => {

  const itemsData = input.items.map((item) => ({
    categoryId: item.categoryId,
    ticketCategoryId: item.ticketCategoryId,
    quantity: item.quantity,
    price: 0, 
  }));

  const total = itemsData.reduce(
    (acc, x) => acc + x.price * x.quantity,
    0
  );

  return prisma.order.create({
    data: {
      userId,
      eventId: input.eventId,
      total,
      items: {
        create: itemsData,
      },
    },
    include: {
      items: true,
    },
  });
};

/**
 * Retorna pedido por ID
 */
export const getOrderByIdService = (id: string) =>
  prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

/**
 * Lista pedidos de um usuário, com paginação opcional
 */
export const listOrdersService = (
  userId: string,
  skip?: number,
  take?: number
) =>
  prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: { items: true },
  });
