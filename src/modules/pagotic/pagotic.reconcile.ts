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

/** Lê external_transaction_id sem usar any */
function getExternalTransactionId(p: PagoticPaymentResponse): string | undefined {
  // campo direto, se existir no tipo
  const direct = (p as Partial<Record<"external_transaction_id", unknown>>).external_transaction_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // às vezes vem em metadata
  const meta = p.metadata as unknown;
  if (meta && typeof meta === "object" && meta !== null) {
    const m = meta as Record<string, unknown>;
    const mExt = m.external_transaction_id;
    if (typeof mExt === "string" && mExt.trim()) return mExt.trim();
  }
  return undefined;
}

export async function reconcileOrderByPaymentId(paymentId: string) {
  const p = await svc.getPaymentById(paymentId);
  const next = normalizeStatus(p.status);

  // Descobre orderId a partir do external_transaction_id (formato "order_<id>")
  const ext = getExternalTransactionId(p);
  const orderId =
    typeof ext === "string" && ext.toLowerCase().startsWith("order_")
      ? ext.slice(6)
      : undefined;

  if (!orderId) {
    console.error("[PagoTIC][reconcile] external_transaction_id ausente no pagamento:", paymentId);
    return { ok: false as const };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, event: true },
  });
  if (!order) {
    console.error("[PagoTIC][reconcile] order não encontrada:", orderId);
    return { ok: false as const };
  }

  // idempotência
  if (order.status === "PAID" && next === "PAID") return { ok: true as const };

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: next,
      externalTransactionId: ext ?? order.externalTransactionId,
      paymentNumber: p.id ?? order.paymentNumber,
    },
    include: { user: true, event: true },
  });

  if (next === "PAID") {
    try {
      const raw = await generateTicketsFromOrder(updated.id);
      const tickets = (raw as Array<Ticket | undefined>).filter(
        (t): t is Ticket => Boolean(t)
      );

      if (updated.user?.email) {
        await sendTicketEmail(updated.user, updated.event, tickets);
      }
      console.log("[PagoTIC][reconcile] tickets emitidos:", tickets.map((t) => t.id));
    } catch (e) {
      console.error("[PagoTIC][reconcile] pós-pagamento falhou:", (e as Error).message);
    }
  }

  return { ok: true as const };
}
