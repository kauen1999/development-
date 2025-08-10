// src/modules/pagotic/pagotic.payload.ts
import type { Order, User, Seat, TicketCategory, OrderItem } from "@prisma/client";
import { formatPagoTICDate, addMinutes } from "./pagotic.utils";
import type { CreatePagoPayload } from "./pagotic.schema";
import { getPagoTICToken } from "./pagotic.auth.service";

async function getAvailableCurrency(): Promise<"ARS" | "USD"> {
  try {
    const apiUrl = process.env.PAGOTIC_API_URL;
    if (!apiUrl) throw new Error("PAGOTIC_API_URL não configurado.");

    const token = await getPagoTICToken();

    const res = await fetch(`${apiUrl}/currencies`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error(`Falha ao consultar moedas disponíveis. Status: ${res.status}`);

    const data = await res.json();
    const available = (data?.currencies ?? []) as string[];

    if (available.includes("ARS")) return "ARS";
    if (available.includes("USD")) return "USD";

    throw new Error("Nenhuma moeda suportada (ARS ou USD) disponível na conta PagoTIC.");
  } catch (err) {
    console.error("[PagoTIC] Erro ao buscar moedas disponíveis:", err);
    return "ARS"; // fallback
  }
}

export async function buildPagoPayload(
  order: Order & {
    orderItems: (OrderItem & { seat: (Seat & { ticketCategory: TicketCategory }) | null })[];
  },
  user: User
): Promise<CreatePagoPayload> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");

  if (!order.paymentNumber || order.paymentNumber.trim() === "") {
    order.paymentNumber = `PAY-${order.id}`;
    console.warn(`[PagoTIC] paymentNumber vazio. Gerado novo: ${order.paymentNumber}`);
  }
  if (!order.externalTransactionId) {
    throw new Error("Pedido sem externalTransactionId.");
  }
  if (!user.email) throw new Error("Usuário sem email.");
  if (!user.dni) throw new Error("Usuário sem DNI.");

  const currency_id = await getAvailableCurrency();

  const now = new Date();
  const due_date = formatPagoTICDate(addMinutes(now, 30));
  const last_due_date = formatPagoTICDate(addMinutes(now, 60));

  const details: CreatePagoPayload["details"] = [
    {
      concept_id: "woocommerce",
      concept_description: `Compra de ingressos - Pedido ${order.id}`,
      amount: Number(order.total.toFixed(2)),
      currency_id,
      external_reference: String(order.id),
    },
  ];

  const payload: CreatePagoPayload = {
    return_url: `${appUrl}/payment/success?orderId=${order.id}`,
    back_url: `${appUrl}/payment/cancel?orderId=${order.id}`,
    notification_url: `${appUrl}/api/webhooks/pagotic`,
    external_transaction_id: order.externalTransactionId,
    payment_number: order.paymentNumber,
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

  console.log("[PagoTIC] Payload final gerado:", JSON.stringify(payload, null, 2));
  return payload;
}
