// src/modules/pagotic/pagotic.payload.ts
// Build a strong, validated PagoTIC Create Payment payload from your domain objects.
// No `any`, clean code, production-ready. Comments in English.

import { z } from "zod";
import type {
  CreatePaymentPayload} from "./pagotic.schema";
import {
  CreatePaymentPayloadSchema,
  PagoticEnvSchema,
  iso3 as ISO3Country,           // reusing validators from schema if you exported them
  rfc822TZ as RFC822WithTZ,      // optional use
} from "./pagotic.schema";

/* ----------------------------------------------------------------------------
 * 1) Domain types (adjust to your project models)
 * ---------------------------------------------------------------------------- */

export const OrderItemInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),                        // e.g., "Ingressos – Platea A"
  conceptId: z.string().min(1).default("woocommerce"),
  description: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.string().length(3).toUpperCase(),    // ISO 4217, e.g., "ARS"
  externalReference: z.string().optional(),        // optional for reconciliation
});

export const PayerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  identification: z.object({
    type: z.string().min(1),                       // e.g., "DNI"
    number: z.string().min(1),
    country: ISO3Country.optional(),               // e.g., "ARG"
  }),
  phone: z
    .object({
      description: z.string().optional(),
      country_code: z.number().int().nonnegative(),
      area_code: z.number().int().nonnegative(),
      number: z.number().int().nonnegative(),
      extension: z.number().int().nonnegative().optional(),
    })
    .optional(),
  externalReference: z.string().optional(),        // your internal user id
});

export const BuildPayloadInputSchema = z.object({
  externalTransactionId: z.string().min(1),        // UNIQUE in your system
  type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).optional(),
  items: z.array(OrderItemInputSchema).min(1),
  payer: PayerInputSchema,

  // Optional dates (RFC 822 + TZ)
  dueDate: RFC822WithTZ.optional(),
  lastDueDate: RFC822WithTZ.optional(),

  // Optional metadata & presets
  metadata: z.record(z.unknown()).optional(),
  presets: z
    .object({
      media_payment_ids: z.array(z.number().int()).optional(),
      type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).optional(),
      promotion_ids: z.string().optional(),
      installments: z.number().int().positive().optional(),
      actions: z.array(z.object({ retry: z.boolean().optional() })).optional(),
    })
    .optional(),
});
export type BuildPayloadInput = z.infer<typeof BuildPayloadInputSchema>;

/* ----------------------------------------------------------------------------
 * 2) Builder
 * - Maps your Order/Items to PagoTIC "details[]"
 * - Injects currency_id per item
 * - Leaves URLs & collector to be enforced by the Service (from ENV)
 * - Validates with CreatePaymentPayloadSchema at the end (fail fast)
 * ---------------------------------------------------------------------------- */

export function buildPagoticCreatePayload(
  rawEnv: NodeJS.ProcessEnv,
  input: BuildPayloadInput
): CreatePaymentPayload {
  // Validate ENV (https-only URLs, required secrets, defaults)
  const env = PagoticEnvSchema.parse(rawEnv);

  // Validate input first (domain-level)
  const data = BuildPayloadInputSchema.parse(input);

  // Normalize details[]
  const details = data.items.map((it) => ({
    external_reference: it.externalReference,
    concept_id: it.conceptId || env.PAGOTIC_CONCEPT_ID_DEFAULT, // safe default
    concept_description: it.description,
    amount: it.amount,
    currency_id: (it.currency || env.PAGOTIC_CURRENCY_ID).toUpperCase(),
    // collector_id per item is optional; usually use the header/ENV level
  }));

  // Compose payer object
  const payer = {
    external_reference: data.payer.externalReference,
    name: data.payer.name,
    email: data.payer.email,
    identification: {
      type: data.payer.identification.type,
      number: data.payer.identification.number,
      country: data.payer.identification.country, // ISO3 (optional)
    },
    phones: data.payer.phone
      ? [
          {
            description: data.payer.phone.description,
            country_code: data.payer.phone.country_code,
            area_code: data.payer.phone.area_code,
            number: data.payer.phone.number,
            extension: data.payer.phone.extension,
          },
        ]
      : undefined,
  };

  // Compose the create payload WITHOUT URLs & collector_id:
  // The Service will enforce `collector_id`, `return_url`, `back_url`, `notification_url` from ENV.
  const payload: CreatePaymentPayload = {
    type: data.type ?? "online",
    external_transaction_id: data.externalTransactionId,
    details,
    payer,
    due_date: data.dueDate,
    last_due_date: data.lastDueDate,
    metadata: data.metadata,
    presets: data.presets,
  };

  // Final schema validation (aligns with API doc)
  return CreatePaymentPayloadSchema.parse(payload);
}

/* ----------------------------------------------------------------------------
 * 3) Helpers (optional): sum & guardrails
 * ---------------------------------------------------------------------------- */

// Sum items amount (useful for assertions/logging)
export function sumItemsAmount(items: BuildPayloadInput["items"]): number {
  return items.reduce((acc, it) => acc + it.amount, 0);
}

/**
 * Optional guard: ensure all item currencies equal your default currency,
 * or throw a helpful error. Useful if your business requires single-currency
 * orders while still letting the caller pass it per item.
 */
export function assertSingleCurrency(
  items: BuildPayloadInput["items"],
  defaultCurrency: string
): void {
  const set = new Set(items.map((i) => (i.currency || defaultCurrency).toUpperCase()));
  if (set.size > 1) {
    throw new Error(`Multiple currencies detected in items: ${Array.from(set).join(", ")}`);
  }
}
