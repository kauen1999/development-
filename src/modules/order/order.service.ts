// src/modules/order/order.service.ts
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput, CreateOrderGeneralInput } from "./order.schema";
import { EventStatus, EventType, OrderStatus, SeatStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { generateExternalTransactionId } from "@/modules/pagotic/pagotic.utils";

/**
 * SEATED (com assentos)
 */
export async function createOrderService(input: CreateOrderInput, userId: string) {
  const { eventId, sessionId, selectedLabels } = input;
  const normalizedLabels = selectedLabels.map((l) => l.replace(/-/g, ""));

  return prisma.$transaction(async (tx) => {
    const seats = await tx.seat.findMany({
      where: { eventId, sessionId, label: { in: normalizedLabels } },
      include: { ticketCategory: true },
    });

    if (seats.length !== normalizedLabels.length) {
      const found = new Set(seats.map((s) => s.label));
      const missing = normalizedLabels.filter((l) => !found.has(l));
      throw new TRPCError({ code: "BAD_REQUEST", message: `Assentos inválidos: ${missing.join(", ")}` });
    }

    const notAvailable = seats.filter((s) => s.status !== SeatStatus.AVAILABLE);
    if (notAvailable.length) {
      const labels = notAvailable.map((s) => s.label).join(", ");
      throw new TRPCError({ code: "CONFLICT", message: `Assentos já reservados ou vendidos: ${labels}` });
    }

    const total = seats.reduce((sum, s) => sum + (s.ticketCategory?.price ?? 0), 0);
    const seatIds = seats.map((s) => s.id);

    const { count } = await tx.seat.updateMany({
      where: { id: { in: seatIds }, status: SeatStatus.AVAILABLE },
      data: { status: SeatStatus.RESERVED, userId },
    });
    if (count !== seatIds.length) {
      throw new TRPCError({ code: "CONFLICT", message: "Alguns assentos foram reservados por outra pessoa. Tente novamente." });
    }

    // 🔹 Gerar IDs obrigatórios no momento da criação
    const externalTransactionId = generateExternalTransactionId(userId);
    const paymentNumber = `PAY-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // 4 minutos

    const order = await tx.order.create({
      data: {
        userId,
        eventId,
        sessionId,
        total,
        status: OrderStatus.PENDING,
        expiresAt,
        externalTransactionId,
        paymentNumber, // 🔹 Agora sempre salvo
        orderItems: { create: seatIds.map((id) => ({ seat: { connect: { id } } })) },
      },
    });

    return { id: order.id };
  });
}

/**
 * GENERAL (sem assentos)
 */
export async function createGeneralOrderService(input: CreateOrderGeneralInput, userId: string) {
  const { eventId, sessionId, items } = input;

  const totalRequested = items.reduce((s, it) => s + it.qty, 0);
  if (totalRequested <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma entrada selecionada." });
  if (totalRequested > 5) throw new TRPCError({ code: "BAD_REQUEST", message: "Máximo de 5 entradas por compra." });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { sessions: true },
  });
  if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
  if (event.status !== EventStatus.OPEN) throw new TRPCError({ code: "BAD_REQUEST", message: "Evento não está aberto." });
  if (event.eventType !== EventType.GENERAL) throw new TRPCError({ code: "BAD_REQUEST", message: "Este endpoint é apenas para eventos do tipo GENERAL." });
  const session = event.sessions.find((s) => s.id === sessionId);
  if (!session) throw new TRPCError({ code: "BAD_REQUEST", message: "Sessão inválida." });

  const orderId = await prisma.$transaction(async (tx) => {
    const categoryIds = [...new Set(items.map((i) => i.categoryId))];
    const categories = await tx.ticketCategory.findMany({ where: { id: { in: categoryIds }, eventId } });
    if (categories.length !== categoryIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Alguma categoria informada não pertence ao evento." });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    for (const it of items) {
      const cat = catMap.get(it.categoryId);
      if (!cat) throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria inválida." });

      const agg = await tx.orderItem.aggregate({
        where: {
          ticketCategoryId: cat.id,
          order: { eventId, sessionId, status: { in: [OrderStatus.PENDING, OrderStatus.PAID] } },
        },
        _sum: { qty: true },
      });
      const alreadyReserved = agg._sum.qty ?? 0;
      if (alreadyReserved + it.qty > cat.capacity) {
        const disponivel = Math.max(0, cat.capacity - alreadyReserved);
        throw new TRPCError({ code: "BAD_REQUEST", message: `Capacidade excedida para '${cat.title}'. Disponível: ${disponivel}` });
      }
    }

    const total = items.reduce((sum, it) => {
      const cat = catMap.get(it.categoryId);
      return cat ? sum + cat.price * it.qty : sum;
    }, 0);

    // Gerar IDs obrigatórios no momento da criação
    const externalTransactionId = generateExternalTransactionId(userId);
    const paymentNumber = `PAY-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // 4 minutos

    const order = await tx.order.create({
      data: {
        userId,
        eventId,
        sessionId,
        total,
        status: OrderStatus.PENDING,
        expiresAt,
        externalTransactionId,
        paymentNumber,
        orderItems: {
          create: items.map((it) => ({
            ticketCategoryId: it.categoryId,
            qty: it.qty,
          })),
        },
      },
    });

    return order.id;
  });

  return { id: orderId };
}
