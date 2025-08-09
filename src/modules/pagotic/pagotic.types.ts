export interface PagoTICResponse {
  id?: string;
  checkout_url?: string;
  form_url?: string;
}

export interface PagoTICPayload {
  type: "online";
  return_url: string;
  back_url: string;
  notification_url: string;

  // 🔹 novo campo requerido
  number: string;

  external_transaction_id: string;
  due_date: string;        // AAAA-MM-DD (ou o formato que você já validou)
  last_due_date: string;   // AAAA-MM-DD
  payment_methods: { method: "credit" }[];

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
      type: "DNI" | "CUIT" | "CUIL" | "PAS";
      number: string;
      country: string; // "AR"
    };
  };
}
