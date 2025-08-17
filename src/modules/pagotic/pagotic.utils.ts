import { parseEnv, type CreatePaymentPayload, type PagoticEnv } from "./pagotic.schema";

/** Itens comerciais exigidos pelo PagoTIC (detalhes da cobrança) */
export type DomainOrderItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string; // ISO 4217 (e.g., ARS)
  conceptId: string; // ex.: "woocommerce"
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
  identification: { type: string; number: string; country?: string };
  phone?: {
    country_code: number;
    area_code: number;
    number: number;
    description?: string;
    extension?: number;
  };
};

/** Valida formato RFC 822 + TZ (yyyy-MM-dd'T'HH:mm:ssZ) */
export function assertRfc822Tz(s: string): void {
  const ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/.test(s);
  if (!ok) throw new Error(`Invalid RFC 822 datetime with TZ: ${s}`);
}

/** Gera external_transaction_id idempotente/simples */
export function buildExternalTransactionId(userId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `tx_${userId}_${ts}_${rand}`;
}

/**
 * Monta o payload de criação de pagamento (POST /pagos) a partir do domínio.
 * - Não define collector_id aqui (o service injeta se houver no ENV).
 * - Injeta URLs públicas do ENV (validadas via parseEnv).
 */
export function buildCreatePayloadFromOrder(
  envIn: NodeJS.ProcessEnv,
  order: DomainOrder,
  payer: DomainUser,
  opts?: {
    type?: "debit" | "online" | "transfer" | "debin" | "coupon";
    dueDate?: string;
    lastDueDate?: string;
    presets?: CreatePaymentPayload["presets"];
    metadata?: Record<string, unknown>;
  }
): CreatePaymentPayload {
  const env: PagoticEnv = parseEnv(envIn); // ✅ evita non-null assertion

  const details: CreatePaymentPayload["details"] = order.items.map((it) => ({
    external_reference: it.externalReference ?? it.id,
    concept_id: it.conceptId,
    concept_description: it.title,
    amount: it.amount,
    currency_id: it.currency,
    // collector_id: não definido aqui
  }));

  const payload: CreatePaymentPayload = {
    type: opts?.type ?? "online",
    external_transaction_id: `order_${order.id}`,
    return_url: env.PAGOTIC_RETURN_URL,
    back_url: env.PAGOTIC_BACK_URL,
    notification_url: env.PAGOTIC_NOTIFICATION_URL,
    details,
    payer: {
      external_reference: payer.id,
      name: payer.name,
      email: payer.email,
      identification: payer.identification,
      phones: payer.phone
        ? [
            {
              description: payer.phone.description,
              country_code: payer.phone.country_code,
              area_code: payer.phone.area_code,
              number: payer.phone.number,
              extension: payer.phone.extension,
            },
          ]
        : undefined,
    },
    metadata: opts?.metadata,
    presets: opts?.presets,
    due_date: opts?.dueDate,
    last_due_date: opts?.lastDueDate,
  };

  return payload;
}
