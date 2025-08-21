import type { Order } from "@prisma/client";
import type { OrderDTO } from "./order.types";

/**
 * Mapper robusto para cenários onde o Prisma Client local ainda não possui o campo `formUrl`.
 * Não usa `any`, faz leitura estrutural opcional.
 */
export function toOrderDTO(order: Order): OrderDTO {
  // Leitura estrutural para `formUrl` (caso o client ainda não tenha o campo no tipo)
  const withFormUrl: { formUrl?: string | null } = order as unknown as {
    formUrl?: string | null;
  };

  return {
    id: order.id,
    userId: order.userId,
    eventId: order.eventId,
    eventSessionId: order.eventSessionId,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    // Prisma permite null aqui
    expiresAt: order.expiresAt ?? null,

    externalTransactionId: order.externalTransactionId ?? null,
    paymentNumber: order.paymentNumber ?? null,
    formUrl: withFormUrl.formUrl ?? null,
  };
}
