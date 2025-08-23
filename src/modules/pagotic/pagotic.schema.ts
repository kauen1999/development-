import { z } from "zod";

export const payerIdSchema = z.object({
  type: z.string().min(1),
  number: z.string().min(1),
  country: z.string().length(3),
});

export const payerSchema = z.object({
  id: z.string().optional(),
  external_reference: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  identification: payerIdSchema.optional(),
  phones: z
    .array(
      z.object({
        description: z.string().optional(),
        country_code: z.number().int().optional(),
        area_code: z.number().int().optional(),
        number: z.number().int().optional(),
        extension: z.number().int().optional(),
      }),
    )
    .optional(),
});

export const detailSchema = z.object({
  payment_id: z.string().optional(),
  external_reference: z.string().optional(),
  concept_id: z.string(),
  concept_description: z.string(),
  amount: z.number().positive(),
  collector_id: z.string().optional(),
  rate: z.number().optional(),
  charge_delay: z.number().optional(),
});

export const createPaymentInput = z.object({
  type: z.enum(["debit", "online", "transfer", "debin", "coupon"]).optional(),
  collector_id: z.string().optional(),
  return_url: z.string().url().optional(),
  back_url: z.string().url().optional(),
  notification_url: z.string().url().optional(),
  external_transaction_id: z.string().min(1),
  details: z.array(detailSchema).min(1),
  currency_id: z.string().length(3).optional(),
  payment_methods: z
    .array(
      z.object({
        authorization_transaction_id: z.string().optional(),
        amount: z.number().positive(),
        media_payment_id: z.number().int(),
        number: z.string().optional(),
        installments: z.number().int().optional(),
        promotion_id: z.string().optional(),
        expiration_year: z.number().int().optional(),
        expiration_month: z.number().int().optional(),
        security_code: z.string().optional(),
        holder: z
          .object({
            name: z.string().optional(),
            identification: payerIdSchema.optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  payer: payerSchema.optional(),
  due_date: z.string().optional(),
  last_due_date: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  carrier: z.string().optional(),
  presets: z
    .object({
      media_payment_ids: z.array(z.number().int()).optional(),
      type: z.enum(["debit", "online", "transfer", "debin", "coupon"]).optional(),
      promotion_ids: z.string().optional(),
      installments: z.number().int().optional(),
      actions: z.array(z.object({ retry: z.boolean().optional() })).optional(),
    })
    .optional(),
});

export const refundInput = z.object({
  id: z.string().min(1),
  type: z.enum(["online", "manual", "by_media_payment"]).optional(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export const cancelPaymentInput = z.object({
  id: z.string().min(1),
  status_detail: z.string().optional(),
});

export const getPaymentByIdInput = z.object({
  id: z.string().min(1),
});

export const listFiltersSchema = z.object({
  field: z.string().min(1),
  operation: z.enum([
    "EQUAL",
    "IN",
    "EXISTS",
    "CONTAINS_IGNORE_CASE",
    "LESS_THAN",
    "LESS_THAN_OR_EQUAL_TO",
    "GREATER_THAN",
    "GREATER_THAN_OR_EQUAL_TO",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const listPaymentsInput = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sorts: z.record(z.enum(["ascending", "descending"])).default({}),
  filters: z.array(listFiltersSchema).min(1),
});

export const groupPaymentsInput = z.object({
  paymentIds: z.array(z.string().min(1)).min(2),
});

export const ungroupPaymentsInput = z.object({
  groupId: z.string().min(1),
});

export const distributionInput = z.object({
  payment_id: z.string().min(1),
  destinations: z
    .array(
      z.object({
        destination_id: z.string().min(1),
        amount: z.number().positive(),
        description: z.string().optional(),
      }),
    )
    .min(1),
});

// Webhook payload (flexível)
export const webhookPayloadSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    collector_id: z.string().optional(),
    notification_url: z.string().optional(),
    details: z.array(detailSchema).optional(),
    payer: payerSchema.optional(),
    final_amount: z.number().optional(),
    request_date: z.string().optional(),
    paid_date: z.string().nullish(),
    rejected_date: z.string().nullish(),
    metadata: z.record(z.any()).optional(),
  })
  .passthrough();
