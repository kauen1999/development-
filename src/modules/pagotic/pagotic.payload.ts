// src/modules/pagotic/pagotic.payload.ts
import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { formatPagoTICDate, addMinutes, generateExternalTransactionId } from "./pagotic.utils";
import type { CreatePagoPayload } from "./pagotic.schema";

/**
 * Gera payload de criação de pagamento no PagoTIC (checkout hospedado).
 * - NÃO envia `type` nem `payment_methods` → API retorna `form_url`.
 * - `payment_number` garantido (evita erro 4120).
 * - `collector_id` opcional (API infere se omitido).
 * - `currency_id` dentro de `details[]` (como na doc).
 * - ISO 3166-1 alpha-3 para país e tipo de documento conforme PagoTIC.
 */
export function buildPagoPayload(
  order: Order & {
    orderItems: (OrderItem & {
      seat: (Seat & { ticketCategory: TicketCategory }) | null;
    })[];
  },
  user: User
): CreatePagoPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const collectorId = process.env.PAGOTIC_COLLECTOR_ID || undefined;

  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  if (!user.email) throw new Error("Usuário sem e-mail.");
  if (!user.dni) throw new Error("Usuário sem DNI.");

  // IDs obrigatórios
  const external_transaction_id = generateExternalTransactionId(order.id);

  // Garante payment_number
  const payment_number = `PAY-${order.id}`;

  // Datas no formato yyyy-MM-dd'T'HH:mm:ssZ (offset sem “:”)
  const now = new Date();
  const due_date = formatPagoTICDate(addMinutes(now, 30));
  const last_due_date = formatPagoTICDate(addMinutes(now, 60));

  // Valor total do pedido
  const total = Number(order.total.toFixed(2));

  // Item de cobrança único (pode ser adaptado para split)
  const details: CreatePagoPayload["details"] = [
    {
      concept_id: "woocommerce",
      concept_description: `Compra de ingressos - Pedido ${order.id}`,
      amount: total,
      currency_id: "ARS",
      external_reference: String(order.id),
    },
  ];

  const payload: CreatePagoPayload = {
    ...(collectorId ? { collector_id: collectorId } : {}), // só envia se definido
    return_url: `${appUrl}/payment/success?orderId=${order.id}`,
    back_url: `${appUrl}/payment/cancel?orderId=${order.id}`,
    notification_url: `${appUrl}/api/webhooks/pagotic`,

    external_transaction_id,
    payment_number,
    due_date,
    last_due_date,

    details,

    payer: {
      external_reference: String(user.id ?? user.email),
      name: user.name ?? "Comprador",
      email: user.email,
      identification: {
        type: "DNI_ARG",
        number: user.dni,
        country: "ARG",
      },
    },
  };

  return payload;
}
