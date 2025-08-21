// Strong types for inputs and normalized outputs.

export type ISO8601Local = string; // e.g. "2020-12-10T00:00:00-0300"
export type FilterOperation =
  | "EQUAL"
  | "IN"
  | "EXISTS"
  | "CONTAINS_IGNORE_CASE"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL_TO"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL_TO";

export interface PagoticListFilter {
  field: string;
  operation: FilterOperation;
  value: string | number | boolean;
}

export type PagoticSortDirection = "ascending" | "descending";

export type PagoticSorts = Record<string, PagoticSortDirection>;

export interface PagoticPayerId {
  type: "DNI_ARG" | "CUIT_ARG" | string;
  number: string;
  country: string; // ISO 3166-1 alpha-3, e.g. "ARG"
}

export interface PagoticPayer {
  id?: string;
  external_reference?: string;
  name?: string;
  email?: string;
  identification?: PagoticPayerId;
  phones?: Array<{
    description?: string;
    country_code?: number;
    area_code?: number;
    number?: number;
    extension?: number;
  }>;
}

export interface PagoticDetail {
  payment_id?: string;
  external_reference?: string;
  concept_id: string;
  concept_description: string;
  amount: number;
  collector_id?: string;
  rate?: number;
  charge_delay?: number;
}

export interface PagoticPaymentMethodsPreset {
  media_payment_ids?: number[];
  type?: "debit" | "online" | "transfer" | "debin" | "coupon";
  promotion_ids?: string;
  installments?: number;
  actions?: Array<{ retry?: boolean }>;
}

export interface CreatePagoticPayment {
  type?: "debit" | "online" | "transfer" | "debin" | "coupon";
  collector_id?: string;
  return_url?: string;
  back_url?: string;
  notification_url?: string;
  external_transaction_id: string;
  details: PagoticDetail[];
  currency_id?: string; // ARS recommended by docs; keep optional to match your project decisions
  payment_methods?: Array<{
    authorization_transaction_id?: string;
    amount: number;
    media_payment_id: number;
    number?: string;
    installments?: number;
    promotion_id?: string;
    expiration_year?: number;
    expiration_month?: number;
    security_code?: string;
    holder?: { name?: string; identification?: PagoticPayerId };
  }>;
  payer?: PagoticPayer;
  due_date?: ISO8601Local;
  last_due_date?: ISO8601Local;
  metadata?: Record<string, unknown>;
  carrier?: string;
  presets?: PagoticPaymentMethodsPreset;
}

export interface PagoticPaymentResponse {
  id: string;
  form_url?: string;
  final_amount: number;
  status: string;
  type?: string;
  collector_id?: string;
  notification_url?: string;
  request_date?: string;
  paid_date?: string | null;
  rejected_date?: string | null;
  due_date?: string | null;
  last_due_date?: string | null;
  currency_id?: string;
  details?: PagoticDetail[];
  payer?: PagoticPayer;
  metadata?: Record<string, unknown>;
  [k: string]: unknown; // keep extensible
}

export interface PagoticListResponse<T> {
  page: number;
  limit: number;
  total: number;
  data: T[];
}

export interface PagoticRefundRequest {
  type?: "online" | "manual" | "by_media_payment";
  amount?: number; // partial refunds
  reason?: string;
}

export interface PagoticDistributionRequest {
  payment_id: string;
  destinations: Array<{
    destination_id: string;
    amount: number;
    description?: string;
  }>;
}

export interface PagoticGroupRequest {
  paymentIds: string[];
}
