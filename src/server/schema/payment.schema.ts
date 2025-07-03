import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().cuid(),
  provider: z.enum(["STRIPE", "MERCADOPAGO", "PAGOFACIL", "RAPIPAGO"]),
  amount: z.number().positive(),
  rawResponse: z.any(), // pode ser objeto do SDK (não tipado)
});

export const getPaymentByOrderIdSchema = z.object({
  orderId: z.string().cuid(),
});

export const paymentWebhookSchema = z.object({
  provider: z.enum(["STRIPE", "MERCADOPAGO", "PAGOFACIL", "RAPIPAGO"]),
  payload: z.any(), // corpo do webhook, dependerá do provedor
});
