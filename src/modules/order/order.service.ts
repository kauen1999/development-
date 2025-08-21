import { prisma } from "@/lib/prisma";
import { PagoticService } from "@/modules/pagotic/pagotic.service";
import {
  calculateExpirationDate,
  calculateOrderTotal,
  generateExternalTransactionId,
} from "./order.utils";
import { ORDER_STATUS } from "./order.constants";
import { OrderNotFoundError } from "./order.errors";
import { toOrderDTO } from "./order.mappers";
import type { OrderItemDTO } from "./order.types";

const pagotic = new PagoticService();

/* ------------------- GENERAL ------------------- */
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

  const enriched = items.map((i) => {
    const cat = catById.get(i.ticketCategoryId);
    if (!cat) throw new Error(`Category ${i.ticketCategoryId} not found`);
    return { ...i, price: cat.price };
  });

  const total = calculateOrderTotal(enriched);

  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      eventSessionId,
      status: ORDER_STATUS.PENDING,
      total,
      expiresAt: calculateExpirationDate(),
      orderItems: {
        create: enriched.map((i) => {
          const cat = catById.get(i.ticketCategoryId);
          if (!cat) throw new Error(`Category ${i.ticketCategoryId} not found`);

          return {
            ticketCategoryId: i.ticketCategoryId,
            qty: i.quantity,
            amount: (i.price ?? 0) * i.quantity,
            title: cat.title ?? "Ticket",
            description: "Event ticket",
            conceptId: "woocommerce",
            currency: "ARS",
          };
        }),
      },
    },
  });

  const externalId = generateExternalTransactionId(order.id);

  const details = enriched.map((i) => {
    const cat = catById.get(i.ticketCategoryId);
    if (!cat) throw new Error(`Category ${i.ticketCategoryId} not found`);

    return {
      concept_id: "woocommerce",
      concept_description: `${cat.title} x${i.quantity}`,
      amount: (i.price ?? 0) * i.quantity,
    };
  });

  const payment = await pagotic.createPayment({
    external_transaction_id: externalId,
    currency_id: "ARS",
    details,
    payer: { external_reference: userId, email: "user@example.com" }, // TODO: e-mail real
    notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/pagotic`,
  });

  // Monta o objeto `data` com tipo do Prisma e injeta `formUrl` de forma segura.
  type UpdateData = Parameters<typeof prisma.order.update>[0]["data"];
  const updateData: UpdateData = {
    externalTransactionId: externalId,
    paymentNumber: payment.id,
  };

  // truque seguro: adiciona a propriedade opcional sem usar `any`
  (updateData as Record<string, unknown>)["formUrl"] = payment.form_url ?? null;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: updateData,
  });

  return toOrderDTO(updated);
}

/* ------------------- SEATED ------------------- */
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
    const cat = catById.get(s.ticketCategoryId);
    if (!cat) throw new Error(`Category ${s.ticketCategoryId} not found`);
    return { ticketCategoryId: s.ticketCategoryId, quantity: 1, price: cat.price };
  });

  const total = calculateOrderTotal(items);

  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      eventSessionId,
      status: ORDER_STATUS.PENDING,
      total,
      expiresAt: calculateExpirationDate(),
      orderItems: {
        create: seats.map((s) => {
          const cat = catById.get(s.ticketCategoryId);
          if (!cat) throw new Error(`Category ${s.ticketCategoryId} not found`);

          return {
            seatId: s.id,
            ticketCategoryId: s.ticketCategoryId,
            qty: 1,
            amount: cat.price,
            title: cat.title ?? "Seated ticket",
            description: "Assigned seat",
            conceptId: "woocommerce",
            currency: "ARS",
          };
        }),
      },
    },
  });

  const externalId = generateExternalTransactionId(order.id);

  const details = seats.map((s) => {
    const cat = catById.get(s.ticketCategoryId);
    if (!cat) throw new Error(`Category ${s.ticketCategoryId} not found`);

    return {
      concept_id: "woocommerce",
      concept_description: `${cat.title} (Seat ${s.id})`,
      amount: cat.price,
    };
  });

  const payment = await pagotic.createPayment({
    external_transaction_id: externalId,
    currency_id: "ARS",
    details,
    payer: { external_reference: userId, email: "user@example.com" },
    notification_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/pagotic`,
  });

  // Mesmo truque para suportar `formUrl` com client desatualizado
  type UpdateData = Parameters<typeof prisma.order.update>[0]["data"];
  const updateData: UpdateData = {
    externalTransactionId: externalId,
    paymentNumber: payment.id,
  };
  (updateData as Record<string, unknown>)["formUrl"] = payment.form_url ?? null;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: updateData,
  });

  return toOrderDTO(updated);
}

/* ------------------- Comuns ------------------- */
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
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderNotFoundError(orderId);
  if (order.status === ORDER_STATUS.PAID) {
    throw new Error("Cannot cancel a paid order");
  }

  if (order.paymentNumber) {
    await pagotic.cancelPayment(order.paymentNumber, "Cancelled by user");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUS.CANCELLED },
  });
  return toOrderDTO(updated);
}

export async function expireOrdersService() {
  const now = new Date();
  const expiredOrders = await prisma.order.updateMany({
    where: { status: ORDER_STATUS.PENDING, expiresAt: { lt: now } },
    data: { status: ORDER_STATUS.EXPIRED },
  });
  return expiredOrders.count;
}
