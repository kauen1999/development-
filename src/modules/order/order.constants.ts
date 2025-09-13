// src/modules/order/order.constants.ts

// Status possíveis de uma Order
export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Regras globais aplicadas a Orders
export const ORDER_RULES = {
  MAX_TICKETS_PER_USER: 5,
  EXPIRATION_MINUTES: 10,
  CONCEPT_ID: process.env.PAGOTIC_CONCEPT_ID ?? "40000001",
};

