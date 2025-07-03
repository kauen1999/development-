import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().cuid(),
  provider: z.enum(["STRIPE"]),
  amount: z.number().positive(),
  rawResponse: z.record(z.any()),
});

export const getPaymentByOrderIdSchema = z.object({
  orderId: z.string().cuid(),
});

export const paymentWebhookSchema = z.object({
  provider: z.enum(["STRIPE"]),
  payload: z.record(z.any()),
});
