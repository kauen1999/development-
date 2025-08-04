import { z } from "zod";

export const createPagoSchema = z.object({
  type: z.literal("online"),
  return_url: z.string().url(),
  back_url: z.string().url(),
  notification_url: z.string().url(),
  external_transaction_id: z.string(),
  due_date: z.string(),
  last_due_date: z.string(),
  payment_methods: z.array(z.object({ method: z.literal("credit") })),
  details: z.array(z.object({
    concept_id: z.literal("woocommerce"),
    concept_description: z.string(),
    amount: z.number(),
    external_reference: z.string(),
  })),
  payer: z.object({
    name: z.string(),
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string(),
      country: z.string(),
    }),
  }),
});
