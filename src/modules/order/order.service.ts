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
import type { Order, OrderItem } from "@prisma/client";
import { OrderStatus, SeatStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { ORDER_RULES } from "./order.constants";
import {
  OrderNotFoundError,
  OrderAlreadyPaidError,
} from "./order.errors";

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

// --- helper comum p/ pagamento ---
async function initPaymentAndUpdate(
  order: Order & { orderItems: OrderItem[] },
  userId: string,
) {
  const externalId = generateExternalTransactionId(order.id);

  // Sufixo único por tentativa (garante diferenciação no adquirente/emissor)
  const attemptTag = Date.now().toString(36);

  const details = order.orderItems.map((i, idx) => {
    const base = i.externalReference ?? `${order.id}-${i.id}-${idx + 1}`;
    return {
      // ex.: <base>-a<ts>  => mantém base estável, mas muda a “tentativa”
      external_reference: `${base}-a${attemptTag}`,
      concept_id: ORDER_RULES.CONCEPT_ID,
      concept_description: i.title,
      amount: i.amount,
    };
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const payment = await pagotic.createPayment({
    external_transaction_id: externalId,                   // mantém fixo por Order
    currency_id: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
    details,
    payer: {
      external_reference: userId,
      email: user?.email || undefined,
      name: user?.name || undefined,
    },
    // útil para observabilidade e depuração no provedor
    metadata: {
      appOrderId: order.id,
      appUserId: userId,
      attemptTag,
    },
  });

  return prisma.order.update({
    where: { id: order.id },
    data: {
      externalTransactionId: externalId,
      paymentNumber: payment.id,
      formUrl: payment.form_url ?? null,
    },
  });
}

// ---------- GENERAL ----------
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
            conceptId: ORDER_RULES.CONCEPT_ID, // 🔹 fixo
            currency: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
            externalReference: `${cat.id}-${idx + 1}`,
          };
        }),
      },
    },
    include: { orderItems: true },
  });

  const updated = await initPaymentAndUpdate(order, userId);
  return toOrderDTO(updated);
}

// ---------- SEATED ----------
export async function createOrderSeatedService(
  userId: string,
  _eventIdParam: string,
  _eventSessionIdParam: string,
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

  const uniqueSeatIds = Array.from(new Set(seatIds));

  const seats = await prisma.seat.findMany({
    where: { id: { in: uniqueSeatIds } },
    select: {
      id: true,
      ticketCategoryId: true,
      status: true,
      labelFull: true,
      rowName: true,
      number: true,
      eventId: true,
      eventSessionId: true,
    },
  });

  if (seats.length !== uniqueSeatIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Algunos asientos no existen." });
  }

  const firstSeat = seats[0];
  if (!firstSeat || !firstSeat.eventId || !firstSeat.eventSessionId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Asientos inválidos." });
  }

  const eventIdFromSeats = firstSeat.eventId;
  const sessionIdFromSeats = firstSeat.eventSessionId;

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.seat.updateMany({
      where: { id: { in: uniqueSeatIds }, status: SeatStatus.AVAILABLE },
      data: { status: SeatStatus.RESERVED },
    });
    if (updated.count !== uniqueSeatIds.length) {
      throw new TRPCError({ code: "CONFLICT", message: "Algunos asientos ya no están disponibles." });
    }

    const categories = await tx.ticketCategory.findMany({
      where: {
        id: { in: seats.map(s => s.ticketCategoryId).filter((id): id is string => !!id) },
        eventId: eventIdFromSeats,
      },
      select: { id: true, price: true, title: true },
    });
    const catById = new Map(categories.map((c) => [c.id, c]));

    const total = seats.reduce(
      (sum, s) =>
        sum + (getCatOrThrow(catById, s.ticketCategoryId ?? "", "Category missing").price ?? 0),
      0,
    );

    return tx.order.create({
      data: {
        userId,
        eventId: eventIdFromSeats,
        eventSessionId: sessionIdFromSeats,
        status: OrderStatus.PENDING,
        total,
        expiresAt: calculateExpirationDate(),
        orderItems: {
          create: seats.map((s, idx) => {
            if (!s.ticketCategoryId) throw new Error("Seat without category");
            const cat = getCatOrThrow(catById, s.ticketCategoryId);
            return {
              seatId: s.id,
              ticketCategoryId: s.ticketCategoryId,
              qty: 1,
              amount: cat.price,
              title: cat.title ?? "Seated ticket",
              description: "Assigned seat",
              conceptId: ORDER_RULES.CONCEPT_ID, // 🔹 fixo
              currency: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
              externalReference: `${s.id}-${idx + 1}`,
            };
          }),
        },
      },
      include: { orderItems: true },
    });
  });

  try {
    const updated = await initPaymentAndUpdate(order, userId);
    return toOrderDTO(updated);
  } catch {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
      await tx.seat.updateMany({
        where: { id: { in: uniqueSeatIds }, status: SeatStatus.RESERVED },
        data: { status: SeatStatus.AVAILABLE },
      });
    });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No fue posible iniciar el pago." });
  }
}

// ---------- FROM CART ----------
export async function createOrderFromCartService(userId: string) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    include: {
      seat: { include: { ticketCategory: { select: { eventId: true, price: true, title: true } } } },
      ticketCategory: { select: { eventId: true, price: true, title: true } },
      eventSession: { select: { eventId: true } },
    },
  });

  if (cartItems.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Carrinho vazio ou expirado." });
  }

  const first = cartItems[0];
  if (!first || !first.eventSessionId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Itens do carrinho inválidos." });
  }

  const eventId =
    first.seat?.ticketCategory?.eventId ??
    first.ticketCategory?.eventId ??
    first.eventSession?.eventId;

  const sessionId = first.eventSessionId;
  if (!eventId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Itens do carrinho sem evento válido." });
  }

  const total = cartItems.reduce((sum, item) => {
    const price = item.seat?.ticketCategory?.price ?? item.ticketCategory?.price ?? 0;
    return sum + price * (item.quantity ?? 1);
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        eventId,
        eventSessionId: sessionId,
        status: OrderStatus.PENDING,
        total,
        expiresAt: calculateExpirationDate(),
        orderItems: {
          create: cartItems.map((item, idx) => {
            const price = item.seat?.ticketCategory?.price ?? item.ticketCategory?.price ?? 0;
            return {
              seatId: item.seatId ?? undefined,
              ticketCategoryId: item.ticketCategoryId ?? undefined,
              qty: item.quantity ?? 1,
              amount: price * (item.quantity ?? 1),
              title: item.seat
                ? `Asiento ${item.seat.labelFull}`
                : item.ticketCategory?.title ?? "Ticket",
              description: item.seat ? "Assigned seat" : "General ticket",
              conceptId: ORDER_RULES.CONCEPT_ID, // 🔹 fixo
              currency: process.env.PAGOTIC_CURRENCY_ID ?? "ARS",
              externalReference: `${item.id}-${idx + 1}`,
            };
          }),
        },
      },
      include: { orderItems: true },
    });

    await tx.cartItem.deleteMany({ where: { userId } });
    return created;
  });

  try {
    const updated = await initPaymentAndUpdate(order, userId);
    return toOrderDTO(updated);
  } catch {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
      const seatIds = order.orderItems.map((i) => i.seatId).filter((id): id is string => !!id);
      if (seatIds.length) {
        await tx.seat.updateMany({
          where: { id: { in: seatIds }, status: SeatStatus.RESERVED },
          data: { status: SeatStatus.AVAILABLE },
        });
      }
    });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No fue posible iniciar el pago." });
  }
}

// ---------- commons ----------
export async function getOrderByIdService(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);
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
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status === OrderStatus.PAID) {
      throw new OrderAlreadyPaidError(orderId);
    }

    if (order.paymentNumber) {
      await pagotic.cancelPayment(order.paymentNumber, "Cancelled by user");
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { seatId: true },
    });
    const seatIds = Array.from(new Set(items.map(i => i.seatId).filter((id): id is string => !!id)));
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
    const seatIds = Array.from(new Set(items.map(i => i.seatId).filter((id): id is string => !!id)));
    if (seatIds.length) {
      await tx.seat.updateMany({
        where: { id: { in: seatIds }, status: SeatStatus.RESERVED },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    return orderIds.length;
  });
}
