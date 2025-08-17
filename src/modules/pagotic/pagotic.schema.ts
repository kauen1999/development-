import { z } from "zod";

// Basic URL validator that enforces https
const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "URL must start with https://");

// ISO3 country validator (ARG, BRA, etc.)
export const iso3 = z
  .string()
  .regex(/^[A-Z]{3}$/, "Must be an ISO3 country code (e.g., ARG)");

// ISO 4217 currency validator (3 uppercase letters, e.g., ARS)
export const iso4217 = z
  .string()
  .regex(/^[A-Z]{3}$/, "Must be an ISO 4217 currency (e.g., ARS)");

// Env schema (server)
// ✅ MUDANÇA: PAGOTIC_COLLECTOR_ID agora é opcional e aceita string vazia.
export const PagoticEnvSchema = z.object({
  // OAuth2 (password grant)
  PAGOTIC_AUTH_URL: httpsUrl,
  PAGOTIC_CLIENT_ID: z.string().min(1),
  PAGOTIC_CLIENT_SECRET: z.string().min(1),
  PAGOTIC_USERNAME: z.string().min(1),
  PAGOTIC_PASSWORD: z.string().min(1),

  // API base + collector
  PAGOTIC_API_URL: httpsUrl,
  PAGOTIC_COLLECTOR_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional()
  ),

  // Public redirect + webhook URLs
  PAGOTIC_RETURN_URL: httpsUrl,
  PAGOTIC_BACK_URL: httpsUrl,
  PAGOTIC_NOTIFICATION_URL: httpsUrl,

  // Business defaults
  PAGOTIC_CURRENCY_ID: iso4217.default("ARS"),
  PAGOTIC_CONCEPT_ID_DEFAULT: z.string().min(1).default("woocommerce"),
});
export type PagoticEnv = z.infer<typeof PagoticEnvSchema>;

/* ---------------------------------- */
/* Helpers / base                     */
/* ---------------------------------- */

// RFC 822-like datetime with timezone e.g. 2025-10-15T23:59:59-0300
export const rfc822TZ = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/,
    "Expected format: yyyy-MM-dd'T'HH:mm:ssZ (e.g., 2025-10-15T23:59:59-0300)"
  );

// Natural positive money amount
const money = z
  .number({ invalid_type_error: "amount must be a number" })
  .finite()
  .nonnegative();

/** Coerce number from number | string | shallow/deep objects */
function coerceNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Number(input);
    if (Number.isFinite(n)) return n;
  }
  if (typeof input === "object" && input !== null) {
    const keys = [
      "final_amount",
      "amount",
      "total",
      "value",
      "val",
      "amount_total",
      "gross",
      "net",
    ];
    for (const k of keys) {
      const v = (input as Record<string, unknown>)[k];
      const n = coerceNumber(v);
      if (typeof n === "number") return n;
    }
    for (const v of Object.values(input as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const n = coerceNumber(v);
        if (typeof n === "number") return n;
      }
    }
  }
  return undefined;
}

/* ---------------------------------- */
/* 3) Payment payload (POST /pagos)   */
/* ---------------------------------- */

export const PagoticPaymentType = z.enum([
  "debit",
  "online",
  "transfer",
  "debin",
  "coupon",
]);

export const IdentificationSchema = z.object({
  type: z.string().min(1),
  number: z.string().min(1),
  country: iso3.optional(),
});

export const HolderSchema = z.object({
  name: z.string().min(1),
  identification: IdentificationSchema,
});

export const PhoneSchema = z.object({
  description: z.string().min(1).optional(),
  country_code: z.number().int().nonnegative(),
  area_code: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  extension: z.number().int().nonnegative().optional(),
});

export const PayerSchema = z.object({
  id: z.string().min(1).optional(),
  external_reference: z.string().min(1).optional(),
  name: z.string().min(1),
  email: z.string().email(),
  identification: IdentificationSchema,
  phones: z.array(PhoneSchema).optional(),
});

export const PaymentMethodSchema = z.object({
  authorization_transaction_id: z.string().min(1).optional(),
  amount: money.optional(),
  media_payment_id: z.number().int().optional(),
  number: z.string().min(4).optional(),
  installments: z.number().int().positive().optional(),
  promotion_id: z.string().min(1).optional(),
  expiration_year: z.number().int().optional(),
  expiration_month: z.number().int().optional(),
  security_code: z.string().min(3).optional(),
  holder: HolderSchema.optional(),
});

export const DetailItemSchema = z.object({
  payment_id: z.string().min(1).optional(),
  external_reference: z.string().min(1).optional(),
  concept_id: z.string().min(1),
  concept_description: z.string().min(1),
  amount: money,
  collector_id: z.string().min(1).optional(),
  rate: money.optional(),
  charge_delay: money.optional(),
  currency_id: iso4217,
});

export const PresetsSchema = z.object({
  media_payment_ids: z.array(z.number().int()).optional(),
  type: PagoticPaymentType.optional(),
  promotion_ids: z.string().min(1).optional(),
  installments: z.number().int().positive().optional(),
  actions: z.array(z.object({ retry: z.boolean().optional() })).optional(),
});

export const CreatePaymentPayloadSchema = z.object({
  type: PagoticPaymentType.optional(),
  collector_id: z.string().min(1).optional(),
  return_url: httpsUrl.optional(),
  back_url: httpsUrl.optional(),
  notification_url: httpsUrl.optional(),
  external_transaction_id: z.string().min(1),
  details: z.array(DetailItemSchema).min(1, "At least one detail item is required"),
  payment_methods: z.array(PaymentMethodSchema).optional(),
  payer: PayerSchema,
  due_date: rfc822TZ.optional(),
  last_due_date: rfc822TZ.optional(),
  metadata: z.record(z.unknown()).optional(),
  carrier: z.string().min(1).optional(),
  presets: PresetsSchema.optional(),
});
export type CreatePaymentPayload = z.infer<typeof CreatePaymentPayloadSchema>;

/* ---------------------------------- */
/* 4) OAuth2 token schemas            */
/* ---------------------------------- */

export const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const RefreshTokenFormSchema = z.object({
  grant_type: z.literal("refresh_token"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  refresh_token: z.string().min(1),
});
export type RefreshTokenForm = z.infer<typeof RefreshTokenFormSchema>;

/* ---------------------------------- */
/* 5) Payment GET response (essentials)*/
/* ---------------------------------- */

export const FeeDetailSchema = z.object({
  type: z.enum([
    "fee",
    "carrier_fee",
    "media_payment_cost",
    "carrier_cost",
    "refund_cost",
    "deferred_cost",
    "discount",
    "rebilling_cost",
    "tariff",
    "financial_cost",
    "overdue_payment",
    "others",
  ]),
  fee_payer: z.enum(["collector", "payer"]),
  description: z.string().optional(),
  amount: money,
});

export const GatewaySchema = z.object({
  establishment_number: z.string().optional(),
  merchant_id: z.string().optional(),
  transaction_id: z.string().optional(),
  batch_number: z.string().optional(),
  ticket_number: z.string().optional(),
});

export const PaymentStatus = z.enum([
  "pending",
  "issued",
  "approved",
  "in_process",
  "rejected",
  "cancelled",
  "refunded",
  "deferred",
  "objected",
  "review",
  "validate",
  "overdue",
]);

export const PaymentMethodSummarySchema = z.object({
  amount: money.optional(),
  media_payment_id: z.number().int().optional(),
  first_six_digits: z.string().optional(),
  last_four_digits: z.string().optional(),
  installments: z.number().int().optional(),
  promotion_id: z.string().optional(),
  expiration_year: z.number().int().optional(),
  expiration_month: z.number().int().optional(),
  authorization_code: z.string().optional(),
  ticket_number: z.string().optional(),
  holder: HolderSchema.optional(),
});

// ✅ Normalização: amount e final_amount podem vir como string/objeto; viram number opcional
export const GetPaymentResponseSchema = z
  .object({
    id: z.string(),
    external_transaction_id: z.string(),
    type: PagoticPaymentType.optional(),
    collector_id: z.string().optional(),
    return_url: httpsUrl.optional(),
    back_url: httpsUrl.optional(),
    notification_url: httpsUrl.optional(),
    form_url: httpsUrl.optional(),

    details: z.array(
      z.object({
        payment_id: z.string().optional(),
        external_reference: z.string().optional(),
        concept_id: z.string().min(1),
        concept_description: z.string().min(1),
        amount: money,
        collector_id: z.string().optional(),
        rate: money.optional(),
        charge_delay: money.optional(),
        currency_id: iso4217,
      })
    ),

    payment_methods: z.array(PaymentMethodSummarySchema).optional(),
    gateway: GatewaySchema.optional(),

    payer: z
      .object({
        email: z.string().email().optional(),
        identification: IdentificationSchema.partial().optional(),
        phones: z.array(PhoneSchema).optional(),
      })
      .optional(),

    fee_details: z.array(FeeDetailSchema).optional(),

    // ✅ Campos normalizados
    amount: z.preprocess((v) => coerceNumber(v), z.number().nonnegative().optional()).optional(),
    final_amount: z.preprocess((v) => coerceNumber(v), z.number().nonnegative().optional()).optional(),

    status: PaymentStatus,
    status_detail: z.string().optional(),
    validation: z.boolean().optional(),
    review: z.boolean().optional(),
    upgradeable: z.boolean().optional(),

    // Dates (RFC 822 + TZ)
    request_date: rfc822TZ.optional(),
    due_date: rfc822TZ.optional(),
    last_due_date: rfc822TZ.optional(),
    process_date: rfc822TZ.optional(),
    paid_date: rfc822TZ.optional(),
    rejected_date: rfc822TZ.optional(),
    cancel_date: rfc822TZ.optional(),
    accreditation_date: rfc822TZ.optional(),
    review_validation_date: z.string().optional(),
    payer_validation_date: z.string().optional(),
    payer_deferred_date: z.string().optional(),
    last_updated_date: rfc822TZ.optional(),

    metadata: z.record(z.unknown()).optional(),
    carrier: z.string().optional(),
    source: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        type: z.enum(["collector", "system", "backoffice", "customer", "carrier"]).optional(),
      })
      .optional(),
  })
  .passthrough();

export type GetPaymentResponse = z.infer<typeof GetPaymentResponseSchema>;

/** Helper: prefere final_amount -> amount -> fallback (sempre retorna number) */
export function getNormalizedAmount(resp: GetPaymentResponse, fallback: number): number {
  if (typeof resp.final_amount === "number") return resp.final_amount;
  if (typeof resp.amount === "number") return resp.amount;
  return fallback;
}

/* ---------------------------------- */
/* 6) Safe parsers (helpers)          */
/* ---------------------------------- */

export function parseEnv(env: unknown): PagoticEnv {
  const result = PagoticEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid PagoTIC env. ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ")}`
    );
  }
  return result.data;
}

export function parseCreatePaymentPayload(payload: unknown): CreatePaymentPayload {
  const result = CreatePaymentPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `Invalid CreatePayment payload. ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ")}`
    );
  }
  return result.data;
}

export function parseTokenResponse(json: unknown): TokenResponse {
  const result = TokenResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid token response. ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ")}`
    );
  }
  return result.data;
}

export function parseGetPaymentResponse(json: unknown): GetPaymentResponse {
  const result = GetPaymentResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid GetPayment response. ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ")}`
    );
  }
  return result.data;
}
