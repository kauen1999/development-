import { z } from "zod";

export const createPagoSchema = z.object({
  type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).default("online"),
  collector_id: z.string(),
  return_url: z.string().url(),
  back_url: z.string().url(),
  notification_url: z.string().url(),
  external_transaction_id: z.string(),
  details: z.array(
    z.object({
      concept_id: z.string(),
      concept_description: z.string(),
      amount: z.number(),
      currency_id: z.string().default("ARS"),
    })
  ),
  payer: z.object({
    name: z.string(),
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string(),
      country: z.string().length(3),
    }),
  }),
});
