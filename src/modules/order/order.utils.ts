// src/modules/order/order.utils.ts
import { ORDER_RULES } from "./order.constants";
import type { OrderDTO, OrderItemDTO } from "./order.types";

export function generateExternalTransactionId(orderId: string): string {
  return `order_${orderId}`;
}


export function calculateOrderTotal(items: OrderItemDTO[]): number {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
}

export function isOrderExpired(order: Pick<OrderDTO, "expiresAt">): boolean {
  if (!order.expiresAt) return false;
  return order.expiresAt.getTime() < Date.now();
}

export function calculateExpirationDate(): Date {
  return new Date(Date.now() + ORDER_RULES.EXPIRATION_MINUTES * 60 * 1000);
}
