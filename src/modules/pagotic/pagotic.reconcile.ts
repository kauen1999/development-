// src/modules/pagotic/pagotic.reconcile.ts
import { prisma } from "@/lib/prisma";
import { PagoticService } from "./pagotic.service";
import type { Ticket } from "@prisma/client";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { PagoticPaymentResponse } from "./pagotic.types";

const svc = new PagoticService();

function normalizeStatus(s?: string): "PAID" | "PENDING" | "CANCELLED" {
  const v = (s ?? "").toLowerCase().trim();
  const paid = new Set(["approved", "accredited", "paid", "aprobado", "pagado"]);
  const cancelled = new Set(["rejected", "cancelled", "canceled", "refunded", "objected"]);
  if (paid.has(v)) return "PAID";
  if (cancelled.has(v)) return "CANCELLED";
  return "PENDING";
}

/** Tenta obter external_transaction_id do payload (campo raiz ou dentro de metadata) */
function getExternalTransactionId(p: PagoticPaymentResponse): string | undefined {
  // 1) alguns ambientes trazem este campo na raiz (não tipado oficialmente)
  const root = (p as unknown as Record<string, unknown>)["external_transaction_id"];
  if (typeof root === "string" && root.trim()) return root.trim();

  // 2) às vezes vem em metadata
  const meta = p.metadata as unknown;
  if (meta && typeof meta === "object") {
    const ext = (meta as Record<string, unknown>)["external_transaction_id"];
    if (typeof ext === "string" && ext.trim()) return ext.trim();
  }
  return undefined;
}

export async function reconcileOrderByPaymentId(paymentId: string) {
  const pay: PagoticPaymentResponse = await svc.getPaymentById(paymentId);
  const next = normalizeStatus(pay.status);


  

  const external = getExternalTransactionId(pay);
  const orderId =
    external && external.toLowerCase().startsWith("order_")
      ? external.slice(6)
      : undefined;

  if (!orderId) {
    console.error("[PagoTIC][reconcile] external_transaction_id ausente;", { paymentId });
    return { ok: false as const };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, Event: true }, // ✅ relação correta é 'Event'
  });
  if (!order) {
    console.error("[PagoTIC][reconcile] order não encontrada:", orderId);
    return { ok: false as const };
  }

  if (order.status === next) {
    return { ok: true as const };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: next,
      externalTransactionId: external ?? order.externalTransactionId,
      paymentNumber: pay.id ?? order.paymentNumber,
    },
    include: { user: true, Event: true }, // ✅ manter 'Event'
  });

  if (next === "PAID") {
    try {
      const raw = await generateTicketsFromOrder(updated.id);
      const tickets = (raw as Array<Ticket | undefined>).filter((t): t is Ticket => Boolean(t));

      if (updated.user?.email) {
        await sendTicketEmail(updated.user, updated.Event, tickets); // ✅ acessar 'Event'
      }
      } catch (e) {
      console.error("[PagoTIC][reconcile] pós-pagamento falhou:", (e as Error).message);
    }
  }

  if (next === "CANCELLED") {
    console.warn("[PagoTIC][reconcile] pagamento rejeitado/cancelado:", { orderId: updated.id });
  }

  return { ok: true as const };
}
