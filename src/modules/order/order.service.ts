// src/modules/order/order.service.ts
import { prisma } from "@/lib/prisma";
import { PagoticService } from "@/modules/pagotic/pagotic.service";
import {
  calculateExpirationDate,
  calculateOrderTotal,
  generateExternalTransactionId,
} from "./order.utils";
import { toOrderDTO } from "./order.mappers";
import type { OrderItemDTO } from "./order.types";
import { OrderStatus, SeatStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { ORDER_RULES } from "./order.constants";

const pagotic = new PagoticService();

function getCatOrThrow<T extends { id: string }>(
  map: Map<string, T>,
  id: string,
  msg = "Category not found",
): T {
  const v = map.get(id);
  if (!v) throw new Error(`${msg}: ${id}`);
  return v;
}

// ---------- GENERAL (inalterado) ----------
export async function createOrderGeneralService(
  userId: string,
  eventId: string,
  eventSessionId: string,
  items: OrderItemDTO[],
) {
  const categories = await prisma.ticketCategory.findMany({
    where: { id: { in: items.map((i) => i.ticketCategoryId) }, eventId },
    select: { id: true, price: true, title: true },
  });
  if (categories.length !== items.length) {
    throw new Error("Some ticket categories were not found for this event");
  }
  const catById = new Map(categories.map((c) => [c.id, c]));

  const enriched: OrderItemDTO[] = items.map((i) => {
    const cat = getCatOrThrow(catById, i.ticketCategoryId);
    return { ...i, price: cat.price };
  });
  const total = calculateOrderTotal(enriched);

  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      eventSessionId,
      status: OrderStatus.PENDING,
      total,
      expiresAt: calculateExpirationDate(),
      orderItems: {
        create: enriched.map((i, idx) => {
          const cat = getCatOrThrow(catById, i.ticketCategoryId);
          return {
            ticketCategoryId: i.ticketCategoryId,
            qty: i.quantity,
            amount: (i.price ?? 0) * i.quantity,
            title: cat.title ?? "Ticket",
            description: "Event ticket",
            conceptId: process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "40000001",
            currency: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
            externalReference: `${cat.id}-${idx + 1}`,
          };
        }),
      },
    },
  });

  const externalId = generateExternalTransactionId(order.id);

  const details = enriched.map((i, idx) => {
    const cat = getCatOrThrow(catById, i.ticketCategoryId);
    return {
      external_reference: `${order.id}-${idx + 1}`,
      concept_id: process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "40000001",
      concept_description: `${cat.title} x${i.quantity}`,
      amount: (i.price ?? 0) * i.quantity,
    };
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const payment = await pagotic.createPayment({
    external_transaction_id: externalId,
    currency_id: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
    details,
    payer: {
      external_reference: userId,
      email: user?.email || undefined,
      name: user?.name || undefined,
    },
  });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      externalTransactionId: externalId,
      paymentNumber: payment.id,
      formUrl: payment.form_url ?? null,
    },
  });

  return toOrderDTO(updated);
}

// ---------- SEATED (corrigido: reserva atômica + rollback, sem non-null) ----------
export async function createOrderSeatedService(
  userId: string,
  _eventIdParam: string,        // mantido por compat
  _eventSessionIdParam: string, // mantido por compat
  seatIds: string[],
) {
  if (seatIds.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Debe seleccionar al menos un asiento." });
  }
  if (seatIds.length > ORDER_RULES.MAX_TICKETS_PER_USER) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Máximo de ${ORDER_RULES.MAX_TICKETS_PER_USER} asientos por compra.`,
    });
  }

  // 0) Dedup para evitar conflitos artificiais
  const uniqueSeatIds = Array.from(new Set(seatIds));
  if (uniqueSeatIds.length !== seatIds.length) {
    const counts = new Map<string, number>();
    for (const id of seatIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const dups = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Asientos duplicados no permitidos: ${dups.join(", ")}`,
    });
  }

  // 1) Busca seats por id (com metadados p/ validação e mensagens)
  const seats = await prisma.seat.findMany({
    where: { id: { in: uniqueSeatIds } },
    select: {
      id: true,
      ticketCategoryId: true,
      status: true,
      label: true,
      row: true,
      number: true,
      eventId: true,
      eventSessionId: true,
    },
  });

  if (seats.length !== uniqueSeatIds.length) {
    const found = new Set(seats.map(s => s.id));
    const missing = uniqueSeatIds.filter(id => !found.has(id));
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Asientos no encontrados: ${missing.join(", ")}`,
    });
  }

  // Guard para TS (evita TS2532 em seats[0])
  const firstSeat = seats[0];
  if (!firstSeat) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Asientos no encontrados." });
  }

  const eventIdFromSeats = firstSeat.eventId;
  const sessionIdFromSeats = firstSeat.eventSessionId;

  if (!eventIdFromSeats) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Los asientos no informan el evento.",
    });
  }
  if (!sessionIdFromSeats) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Los asientos no informan la sesión del evento.",
    });
  }

  // Todos devem ser do mesmo evento/sessão
  if (seats.some(s => s.eventId !== eventIdFromSeats)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No se puede mezclar asientos de distintos eventos en una sola orden.",
    });
  }
  if (seats.some(s => s.eventSessionId !== sessionIdFromSeats)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No se puede mezclar asientos de distintas sesiones en una sola orden.",
    });
  }

  // Normaliza types (sem non-null assertion)
  type SeatWithCat = Omit<typeof seats[number], "ticketCategoryId" | "eventSessionId"> & {
    ticketCategoryId: string;
    eventSessionId: string;
  };

  const seatsWithCat: SeatWithCat[] = seats.map((s) => {
    if (!s.ticketCategoryId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Asiento ${s.id} sin categoría.`,
      });
    }
    return {
      ...s,
      ticketCategoryId: s.ticketCategoryId,
      eventSessionId: sessionIdFromSeats,
    };
  });

  // 2) Categorias p/ precificação
  const categoryIds: string[] = Array.from(new Set(seatsWithCat.map(s => s.ticketCategoryId)));
  const categories = await prisma.ticketCategory.findMany({
    where: { id: { in: categoryIds }, eventId: eventIdFromSeats },
    select: { id: true, price: true, title: true },
  });
  const catById = new Map(categories.map((c) => [c.id, c]));
  if (catById.size !== categoryIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Categorías de ticket no encontradas para el evento.",
    });
  }

  // 3) Transação: RESERVA condicional + criação do pedido
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.seat.updateMany({
      where: {
        id: { in: uniqueSeatIds },
        eventId: eventIdFromSeats,
        eventSessionId: sessionIdFromSeats,
        status: SeatStatus.AVAILABLE,
      },
      data: { status: SeatStatus.RESERVED },
    });

    if (updated.count !== uniqueSeatIds.length) {
      // Identifica quais falharam (já não disponíveis)
      const unavailable = await tx.seat.findMany({
        where: {
          id: { in: uniqueSeatIds },
          NOT: { status: SeatStatus.AVAILABLE },
        },
        select: { label: true, row: true, number: true, status: true },
      });
      const list = unavailable
        .map(s => s.label ?? `${s.row ?? ""}${s.number ?? ""}`)
        .join(", ");
      throw new TRPCError({
        code: "CONFLICT",
        message: `Uno o más asientos ya no están disponibles: ${list}`,
      });
    }

    const total = seatsWithCat.reduce(
      (sum, s) => sum + (getCatOrThrow(catById, s.ticketCategoryId).price ?? 0),
      0,
    );

    const created = await tx.order.create({
      data: {
        userId,
        eventId: eventIdFromSeats,
        eventSessionId: sessionIdFromSeats,
        status: OrderStatus.PENDING,
        total,
        expiresAt: calculateExpirationDate(),
        orderItems: {
          create: seatsWithCat.map((s, idx) => {
            const cat = getCatOrThrow(catById, s.ticketCategoryId, "Ticket category not found");
            return {
              seatId: s.id,
              ticketCategoryId: s.ticketCategoryId,
              qty: 1,
              amount: cat.price,
              title: cat.title ?? "Seated ticket",
              description: "Assigned seat",
              conceptId: process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "40000001",
              currency: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
              externalReference: `${s.id}-${idx + 1}`,
            };
          }),
        },
      },
    });

    return created;
  });

  // 4) Fora da transação: iniciar pagamento
  const externalId = generateExternalTransactionId(order.id);

  const details = seatsWithCat.map((s, idx) => {
    const cat = getCatOrThrow(catById, s.ticketCategoryId, "Ticket category not found");
    const seatLabel = s.label ?? `${s.row ?? ""}${s.number ?? ""}`;
    return {
      external_reference: `${order.id}-seat-${idx + 1}`,
      concept_id: process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "40000001",
      concept_description: `${cat.title} (Seat ${seatLabel})`,
      amount: cat.price,
    };
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  try {
    const payment = await pagotic.createPayment({
      external_transaction_id: externalId,
      currency_id: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
      details,
      payer: {
        external_reference: userId,
        email: user?.email || undefined,
        name: user?.name || undefined,
      },
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        externalTransactionId: externalId,
        paymentNumber: payment.id,
        formUrl: payment.form_url ?? null,
      },
    });

    return toOrderDTO(updated);
  } catch {
    // Falhou o gateway → reverte reserva e cancela pedido
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.seat.updateMany({
        where: {
          id: { in: uniqueSeatIds },
          eventId: eventIdFromSeats,
          eventSessionId: sessionIdFromSeats,
          status: SeatStatus.RESERVED,
        },
        data: { status: SeatStatus.AVAILABLE },
      });
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No fue posible iniciar el pago. Intenta nuevamente.",
    });
  }
}

// ---------- commons ----------
export async function getOrderByIdService(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} not found`);
  return toOrderDTO(order);
}

export async function listOrdersService(userId: string, page = 1, limit = 10) {
  const orders = await prisma.order.findMany({
    where: { userId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrderDTO);
}

export async function cancelOrderService(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentNumber: true },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status === OrderStatus.PAID) {
      throw new Error("Cannot cancel a paid order");
    }

    if (order.paymentNumber) {
      await pagotic.cancelPayment(order.paymentNumber, "Cancelled by user");
    }

    // Libera seats RESERVED deste pedido
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { seatId: true },
    });
    const seatIds = Array.from(new Set(items.map(i => i.seatId).filter(Boolean) as string[]));
    if (seatIds.length) {
      await tx.seat.updateMany({
        where: { id: { in: seatIds }, status: SeatStatus.RESERVED },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
    return toOrderDTO(updated);
  });
}

export async function expireOrdersService() {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const toExpire = await tx.order.findMany({
      where: { status: OrderStatus.PENDING, expiresAt: { lt: now } },
      select: { id: true },
    });
    if (toExpire.length === 0) return 0;

    const orderIds = toExpire.map(o => o.id);

    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: OrderStatus.EXPIRED },
    });

    const items = await tx.orderItem.findMany({
      where: { orderId: { in: orderIds } },
      select: { seatId: true },
    });
    const seatIds = Array.from(new Set(items.map(i => i.seatId).filter(Boolean) as string[]));
    if (seatIds.length) {
      await tx.seat.updateMany({
        where: { id: { in: seatIds }, status: SeatStatus.RESERVED },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    return orderIds.length;
  });
}
