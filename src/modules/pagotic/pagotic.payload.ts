// src/modules/pagotic/pagotic.payload.ts
import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { formatPagoTICDate, addMinutes } from "./pagotic.utils";
import type { CreatePagoPayload } from "./pagotic.schema";

export function buildPagoPayload(
  order: Order & {
    orderItems: (OrderItem & { seat: (Seat & { ticketCategory: TicketCategory }) | null })[];
  },
  user: User
): CreatePagoPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");

  if (!order.paymentNumber) {
  throw new Error(`Pedido ${order.id} está sem paymentNumber mesmo após fallback`);
}
  if (!order.externalTransactionId) throw new Error("Pedido sem externalTransactionId");

  const now = new Date();
  const due_date = formatPagoTICDate(addMinutes(now, 30));
  const last_due_date = formatPagoTICDate(addMinutes(now, 60));

  const details: CreatePagoPayload["details"] = [
    {
      concept_id: "woocommerce",
      concept_description: `Compra de ingressos - Pedido ${order.id}`,
      amount: Number(order.total.toFixed(2)),
      currency_id: "ARS",
      external_reference: String(order.id),
    },
  ];

  return {
    return_url: `${appUrl}/payment/success?orderId=${order.id}`,
    back_url: `${appUrl}/payment/cancel?orderId=${order.id}`,
    notification_url: `${appUrl}/api/webhooks/pagotic`,
    external_transaction_id: order.externalTransactionId,
    payment_number: order.paymentNumber,
    due_date,
    last_due_date,
    details,
    payer: {
      external_reference: String(user.id ?? user.email ?? "no-ref"),
      name: user.name ?? "Comprador",
      email: user.email ?? "no-email@placeholder.com", // valor padrão se nulo
      identification: {
        type: "DNI_ARG",
        number: user.dni ?? "00000000", // valor padrão se nulo
        country: "ARG",
      },
    },
  };
}
