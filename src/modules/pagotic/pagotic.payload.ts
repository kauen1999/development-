// src/modules/pagotic/pagotic.payload.ts
import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { formatPagoTICDate, addMinutes, generateExternalTransactionId } from "./pagotic.utils";
import type { CreatePagoPayload } from "./pagotic.schema";

/**
 * Gera payload de criação de pagamento no PagoTIC (checkout hospedado).
 * - NÃO envia `type` nem `payment_methods` → API retorna `form_url`.
 * - Inclui `payment_number` para evitar erro 4120.
 * - Adiciona `collector_id` no root (opcional) e `currency_id` dentro de `details[]` (como na doc).
 * - Usa ISO 3166-1 alpha-3 para país e tipo de documento conforme PagoTIC.
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
  const collectorId = process.env.PAGOTIC_COLLECTOR_ID || undefined; // 🔹 Agora opcional

  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  if (!user.email) throw new Error("Usuário sem e-mail.");
  if (!user.dni) throw new Error("Usuário sem DNI.");

  // IDs obrigatórios
  const external_transaction_id = generateExternalTransactionId(order.id);
  const payment_number = `PAY-${order.id}`;

  // Datas no formato yyyy-MM-dd'T'HH:mm:ssZ (sem dois-pontos no offset)
  const now = new Date();
  const due_date = formatPagoTICDate(addMinutes(now, 30));
  const last_due_date = formatPagoTICDate(addMinutes(now, 60));

  // Valor total do pedido
  const total = Number(order.total.toFixed(2));

  // Um único item de cobrança (ajuste se precisar de split)
  const details: CreatePagoPayload["details"] = [
    {
      concept_id: "woocommerce",
      concept_description: `Compra de ingressos - Pedido ${order.id}`,
      amount: total,
      currency_id: "ARS",
      external_reference: String(order.id),
    },
  ];

  // Monta o payload
  const payload: CreatePagoPayload = {
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

  // Só adiciona se existir
  if (collectorId) {
    payload.collector_id = collectorId;
  }

  return payload;
}
