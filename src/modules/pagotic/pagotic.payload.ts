import type { Order, OrderItem, User } from "@prisma/client";
import { generateExternalTransactionId, formatAmount, toRFCDate, addMinutes } from "./pagotic.utils";
import type { z } from "zod";
import type { createPagoSchema } from "./pagotic.service";

type PagoPayload = z.infer<typeof createPagoSchema>;

interface BuildPagoPayloadInput {
  order: Order & { items: (OrderItem & { categoryId: string })[] };
  user: User;
}

export function buildPagoPayload({ order, user }: BuildPagoPayloadInput): PagoPayload {
  const external_transaction_id = generateExternalTransactionId(order.id);
  const dueDate = toRFCDate(addMinutes(new Date(), 30));
  const lastDueDate = toRFCDate(addMinutes(new Date(), 60));

  const collectorId = process.env.PAGOTIC_COLLECTOR_ID;
  const returnUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!collectorId || !returnUrl) {
    throw new Error("Missing PagoTIC environment variables.");
  }

  if (!user.email) {
    throw new Error("User must have a valid email.");
  }

  return {
    type: "online",
    collector_id: collectorId,
    return_url: `${returnUrl}/payment/success`,
    back_url: `${returnUrl}/payment/cancel`,
    notification_url: `${returnUrl}/api/webhooks/pagotic`,
    external_transaction_id,
    details: order.items.map((item) => ({
      concept_id: item.categoryId,
      concept_description: `Ticket - ${item.id}`,
      amount: parseFloat(formatAmount(item.price * item.quantity)),
      currency_id: "ARS",
    })),
    payer: {
      name: user.name ?? "Unnamed",
      email: user.email,
      identification: {
        type: "DNI_ARG",
        number: user.dni ?? "00000000",
        country: "ARG",
      },
    },
    due_date: dueDate,
    last_due_date: lastDueDate,
  };
}
