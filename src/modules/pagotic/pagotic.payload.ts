import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { toRFCDate, addMinutes, generateExternalTransactionId } from "./pagotic.utils";
import type { PagoTICPayload } from "./pagotic.types";

export function buildPagoPayload(
  order: Order & {
    orderItems: (OrderItem & {
      seat: Seat & { ticketCategory: TicketCategory };
    })[];
  },
  user: User
): PagoTICPayload {
  const returnUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!returnUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");

  if (!user.email || !user.dni) {
    throw new Error("Usuário sem e-mail ou DNI.");
  }

  const external_transaction_id = generateExternalTransactionId(order.id);
  const due_date = toRFCDate(addMinutes(new Date(), 30));
  const last_due_date = toRFCDate(addMinutes(new Date(), 60));

  const payload = {
    type: "online",
    return_url: `${returnUrl}/payment/success`,
    back_url: `${returnUrl}/payment/cancel`,
    notification_url: `${returnUrl}/api/webhooks/pagotic`,
    external_transaction_id,
    due_date,
    last_due_date,
    currency_id: "ARS",
    details: [
      {
        concept_id: "woocommerce",
        concept_description: `Compra de ingressos - Pedido ${order.id}`,
        amount: parseFloat(order.total.toFixed(2)),
        external_reference: order.id,
      },
    ],
    payer: {
      name: user.name ?? "Comprador",
      email: user.email,
      identification: {
        type: "DNI_ARG",
        number: user.dni,
        country: "ARG",
      },
    },
    payment_methods: [
  {
    media_payment_id: 1,
  },
],
  } as const;

  return payload;
}
