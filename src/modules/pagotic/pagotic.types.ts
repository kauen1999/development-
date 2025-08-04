// src/modules/pagotic/pagotic.types.ts

export interface PagoTICResponse {
  id: string;
  form_url: string;
}

export interface PagoTICPayload {
  type: "online";
  return_url: string;
  back_url: string;
  notification_url: string;
  external_transaction_id: string;
  due_date: string;
  last_due_date: string;
  currency_id: string;
  details: ReadonlyArray<{
    concept_id: "woocommerce";
    concept_description: string;
    amount: number;
    external_reference: string;
  }>;
  payer: {
    name: string;
    email: string;
    identification: {
      type: string;
      number: string;
      country: string;
    };
  };
}
