// src/modules/order/order.mappers.ts
import type { Order } from "@prisma/client";
import type { OrderDTO } from "./order.types";

export function toOrderDTO(order: Order): OrderDTO {
  return {
    id: order.id,
    userId: order.userId,
    eventId: order.eventId,
    eventSessionId: order.eventSessionId,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    // no schema do Prisma pode ser null
    expiresAt: order.expiresAt ?? null,

    externalTransactionId: order.externalTransactionId ?? null,
    paymentNumber: order.paymentNumber ?? null,

    // alguns clientes Prisma podem ainda não ter o campo tipado; usamos fallback seguro
    // (a coluna existe — vide logs SELECT "Order"."formUrl" — então não quebra o runtime)
    formUrl: (order as unknown as { formUrl?: string | null })?.formUrl ?? null,
  };
}
