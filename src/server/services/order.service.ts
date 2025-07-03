import { prisma } from "../db/client";
import type { CreateOrderInput } from "../schema/order.schema";
import { TRPCError } from "@trpc/server";

export const createOrderService = async (
  input: CreateOrderInput,
  userId: string
) => {
  return prisma.$transaction(async (tx) => {
    // Verificar se o evento existe
    const event = await tx.event.findUnique({
      where: { id: input.eventId },
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Evento não encontrado.",
      });
    }

    // Buscar todas as categorias de ingresso usadas no pedido
    const ticketCategoryIds = input.items.map((i) => i.ticketCategoryId);
    const ticketCategories = await tx.ticketCategory.findMany({
      where: {
        id: { in: ticketCategoryIds },
        eventId: input.eventId,
      },
    });

    if (ticketCategories.length !== ticketCategoryIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Uma ou mais categorias de ingresso são inválidas para este evento.",
      });
    }

    // Preparar os itens com preço real
    const itemsData = input.items.map((item) => {
      const category = ticketCategories.find((c) => c.id === item.ticketCategoryId);
      if (!category) throw new Error("Categoria de ingresso inválida.");

      return {
        categoryId: item.categoryId,
        ticketCategoryId: item.ticketCategoryId,
        quantity: item.quantity,
        price: category.price,
      };
    });

    const total = itemsData.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Criar o pedido e seus itens em uma transação
    const order = await tx.order.create({
      data: {
        userId,
        eventId: input.eventId,
        total,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });

    return order;
  });
};
