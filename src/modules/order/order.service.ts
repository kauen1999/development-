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
import { OrderStatus } from "@prisma/client";

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
      // ✅ Use Prisma enum instead of string/any casts
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
            // Optional: externalReference per item (safe if your schema has this column)
            externalReference: `${cat.id}-${idx + 1}`,
          };
        }),
      },
    },
  });

  const externalId = generateExternalTransactionId(order.id);

  // External reference per detail (some tenants require it)
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

// ---------- SEATED ----------
export async function createOrderSeatedService(
  userId: string,
  eventId: string,
  eventSessionId: string,
  seatIds: string[],
) {
  const seats = await prisma.seat.findMany({
    where: { id: { in: seatIds }, eventId, eventSessionId },
    select: { id: true, ticketCategoryId: true },
  });
  if (seats.length !== seatIds.length) {
    throw new Error("Some seats were not found for this session");
  }

  const categories = await prisma.ticketCategory.findMany({
    where: { id: { in: seats.map((s) => s.ticketCategoryId) }, eventId },
    select: { id: true, price: true, title: true },
  });
  const catById = new Map(categories.map((c) => [c.id, c]));

  const items: OrderItemDTO[] = seats.map((s) => {
    const cat = getCatOrThrow(catById, s.ticketCategoryId);
    return { ticketCategoryId: s.ticketCategoryId, quantity: 1, price: cat.price };
  });

  const total = calculateOrderTotal(items);

  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      eventSessionId,
      status: OrderStatus.PENDING,
      total,
      expiresAt: calculateExpirationDate(),
      orderItems: {
        create: seats.map((s, idx) => {
          const cat = getCatOrThrow(catById, s.ticketCategoryId);
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

  const externalId = generateExternalTransactionId(order.id);

  const details = seats.map((s, idx) => {
    const cat = getCatOrThrow(catById, s.ticketCategoryId);
    return {
      external_reference: `${order.id}-seat-${idx + 1}`,
      concept_id: process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "40000001",
      concept_description: `${cat.title} (Seat ${s.id})`,
      amount: cat.price,
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
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status === OrderStatus.PAID) {
    throw new Error("Cannot cancel a paid order");
  }
  if (order.paymentNumber) {
    await pagotic.cancelPayment(order.paymentNumber, "Cancelled by user");
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
  });
  return toOrderDTO(updated);
}

export async function expireOrdersService() {
  const now = new Date();
  const expiredOrders = await prisma.order.updateMany({
    where: { status: OrderStatus.PENDING, expiresAt: { lt: now } },
    data: { status: OrderStatus.EXPIRED },
  });
  return expiredOrders.count;
}
