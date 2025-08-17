// src/modules/pagotic/pagotic.types.ts
// Public types facade for the PagoTIC module.
// - Derives types from Zod schemas to avoid duplication/drift
// - Exposes domain and service/router-facing types
// - No `any`, production-safe

import type { z } from "zod";

/* =============================================================================
 * 1) Reuse types from our Zod schemas (single source of truth)
 *    Adjust the import paths if your files live elsewhere.
 * ========================================================================== */
import type {
  PagoticEnvSchema,
  CreatePaymentPayloadSchema,
  GetPaymentResponseSchema,
} from "./pagotic.schema";

export type PagoticEnv = z.infer<typeof PagoticEnvSchema>;
export type CreatePaymentPayload = z.infer<typeof CreatePaymentPayloadSchema>;
export type GetPaymentResponse = z.infer<typeof GetPaymentResponseSchema>;

/* =============================================================================
 * 2) Builder inputs (export the types you already use in the payload builder)
 * ========================================================================== */
import type {
  BuildPayloadInputSchema,
  PayerInputSchema,
  OrderItemInputSchema,
} from "./pagotic.payload";

export type BuildPayloadInput = z.infer<typeof BuildPayloadInputSchema>;
export type PayerInput = z.infer<typeof PayerInputSchema>;
export type OrderItemInput = z.infer<typeof OrderItemInputSchema>;

/* =============================================================================
 * 3) Domain types used by the router (Prisma -> Domain -> Builder)
 *    Keep these aligned with your router mapping functions.
 * ========================================================================== */
export type DomainOrderItem = {
  id: string;
  title: string;
  description: string;
  amount: number;         // total per item (unitPrice * qty)
  currency: string;       // ISO 4217 (e.g. "ARS")
  conceptId: string;      // default "woocommerce" from ENV if not given
  externalReference?: string;
};

export type DomainOrder = {
  id: string;
  items: DomainOrderItem[];
};

export type DomainUser = {
  id: string;
  name: string;
  email: string;
  identification: {
    type: string;         // e.g. "DNI"
    number: string;
    country?: string;     // ISO3 (e.g. "ARG")
  };
  phone?: {
    country_code: number;
    area_code: number;
    number: number;
    description?: string;
    extension?: number;
  };
};

/* =============================================================================
 * 4) Service contract types
 * ========================================================================== */
export type PagoticServiceOptions = {
  logger?: Pick<Console, "info" | "warn" | "error" | "debug">;
  timeoutMs?: number;
};

export type CreatePaymentResult = {
  id: string;
  form_url?: string | null; // hosted checkout URL (optional in some responses)
};

export type HttpErrorPayload = {
  status: number;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  requestId?: string;
  body?: unknown;          // raw error body from provider
  message?: string;        // normalized message (safe for logs)
};

/* =============================================================================
 * 5) Router input/output helper types (tRPC), if useful in your codebase
 *    These mirror the z.input() you already have, but are handy outside tRPC.
 * ========================================================================== */
export type CreateFromOrderInput = {
  orderId: string;
  type?: "online" | "debit" | "transfer" | "debin" | "coupon";
  dueDate?: string;        // RFC 822 + TZ, e.g. 2025-10-15T23:59:59-0300
  lastDueDate?: string;    // RFC 822 + TZ
  presets?: {
    media_payment_ids?: number[];
    type?: "online" | "debit" | "transfer" | "debin" | "coupon";
    promotion_ids?: string;
    installments?: number;
    actions?: Array<{ retry?: boolean }>;
  };
};

export type GetPaymentInput = { id: string };

export type CreateFromOrderOutput = CreatePaymentResult;
export type GetPaymentByIdOutput = GetPaymentResponse;

/* =============================================================================
 * 6) Webhook shapes (minimal, non-breaking)
 *    Keep generic to accommodate provider changes; validate with Zod in route.
 * ========================================================================== */
export type PagoticWebhookEvent = {
  id: string;
  external_transaction_id: string;
  status: string;                 // e.g. "approved" | "pending" | "rejected" | ...
  final_amount?: number;
  currency_id?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;            // RFC 822 + TZ
  updated_at?: string;            // RFC 822 + TZ
};

/* =============================================================================
 * 7) Narrow helpers (type guards)
 * ========================================================================== */
export function isCreatePaymentResult(x: unknown): x is CreatePaymentResult {
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as { id: unknown }).id === "string"
  );
}

export function isHttpErrorPayload(x: unknown): x is HttpErrorPayload {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.status === "number" &&
    typeof o.url === "string" &&
    typeof o.method === "string"
  );
}
