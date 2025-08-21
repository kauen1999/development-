// Minimal references. Extend as you onboard more media/currencies from the docs.

export const MediaPaymentId = {
  VISA_CREDIT: 9, // example from docs' notification
  RAPIPAGO: 97,   // coupon media id (docs)
  PAGOFACIL: 98,  // coupon media id (docs)
} as const;

export type MediaPaymentId = (typeof MediaPaymentId)[keyof typeof MediaPaymentId];

export const Currency = {
  ARS: "ARS",
} as const;
