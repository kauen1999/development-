// src/modules/pagotic/pagotic.payload.ts
import { formatPagoTICDate, addMinutes, getAvailableCurrency } from "./pagotic.utils";
import { env } from "@/env/server";
import type { Order, User, OrderItem, Seat, TicketCategory, Event } from "@prisma/client";

type OrderWithRelations = Order & {
  orderItems: (OrderItem & {
    seat: (Seat & { ticketCategory: TicketCategory }) | null;
  })[];
  event: Event;
};

export async function buildPagoPayload(order: OrderWithRelations, user: User) {
  const currency = await getAvailableCurrency("ARS");

  const now = new Date();
  const dueDate = addMinutes(now, 30);
  const lastDueDate = addMinutes(now, 60);

  return {
    return_url: `${env.PAGOTIC_RETURN_URL}?orderId=${order.id}`,
    back_url: `${env.PAGOTIC_BACK_URL}?orderId=${order.id}`,
    notification_url: env.PAGOTIC_NOTIFICATION_URL,
    external_transaction_id: `order-${order.id}-${Date.now()}`,
    payment_number: order.paymentNumber ?? undefined,
    due_date: formatPagoTICDate(dueDate),
    last_due_date: formatPagoTICDate(lastDueDate),
    details: [
      {
        concept_id: "woocommerce",
        concept_description: `Compra de ingressos - Pedido ${order.id}`,
        amount: order.total,
        currency_id: currency,
        external_reference: order.id,
      },
    ],
    payer: {
      external_reference: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      identification: {
        type: "DNI_ARG",
        number: user.dni ?? "00000000",
        country: "ARG",
      },
    },
  };
}
