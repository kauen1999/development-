export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_RULES = {
  MAX_TICKETS_PER_USER: 5,
  EXPIRATION_MINUTES: 10,
};
