// src/moduls/pagotic/pagotic.mappers.ts
import type { PagoticPaymentResponse } from "./pagotic.types";

// Example normalization to your domain if needed.
export function mapPayment(resp: PagoticPaymentResponse) {
  return {
    id: resp.id,
    status: resp.status,
    finalAmount: resp.final_amount,
    formUrl: resp.form_url ?? null,
    paidAt: resp.paid_date ?? null,
    requestDate: resp.request_date ?? null,
    details: resp.details ?? [],
    raw: resp,
  };
}