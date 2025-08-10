// src/modules/pagotic/pagotic.payload.ts
import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { formatPagoTICDate, addMinutes, generateExternalTransactionId } from "./pagotic.utils";
import type { CreatePagoPayload } from "./pagotic.schema";

/**
 * Gera payload de criação de pagamento no PagoTIC.
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
  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  if (!user.email) throw new Error("Usuário sem e-mail.");
  if (!user.dni) throw new Error("Usuário sem DNI.");

  // 🔹 Gerar IDs obrigatórios
  const external_transaction_id = generateExternalTransactionId(order.id);
  const payment_number = `PAY-${order.id}`; // pode ser só order.id, mas prefixar ajuda

  // Datas no formato yyyy-MM-dd'T'HH:mm:ssZ (sem dois-pontos no offset)
  const due_date = formatPagoTICDate(addMinutes(new Date(), 30));
  const last_due_date = formatPagoTICDate(addMinutes(new Date(), 60));

  return {
    return_url: `${appUrl}/payment/success`,
    back_url: `${appUrl}/payment/cancel`,
    notification_url: `${appUrl}/api/webhooks/pagotic`,

    payment_number,               // Campo exigido pelo PagoTIC
    external_transaction_id,     
    due_date,
    last_due_date,
    currency_id: "ARS",

    details: [
      {
        concept_id: "woocommerce", // use um ID real registrado no PagoTIC
        concept_description: `Compra de ingressos - Pedido ${order.id}`,
        amount: Number(order.total.toFixed(2)),
        external_reference: order.id,
      },
    ],

    payer: {
      name: user.name ?? "Comprador",
      email: user.email,
      identification: {
        type: "DNI",
        number: user.dni,
        country: "AR",
      },
    },
  };
}
