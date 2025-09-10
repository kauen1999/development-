// src/modules/order/order.utils.ts
import { ORDER_RULES } from "./order.constants";
import type { OrderDTO, OrderItemDTO } from "./order.types";

export function generateExternalTransactionId(orderId: string): string {
  // Mantemos o prefixo para o gateway
  return `order_${orderId}`;
}

// Helper opcional para uso em outras partes
export function stripOrderPrefix(external: string | undefined): string {
  const raw = (external ?? "").trim();
  if (!raw) return "";
  return raw.toLowerCase().startsWith("order_") ? raw.slice(6) : raw;
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
