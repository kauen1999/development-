// src/modules/pagotic/pagotic.webhook.ts
// Core do webhook PagoTIC (sem acoplamento com framework HTTP)
// - Valida body com Zod
// - (Opcional) autoriza por header secreto (x-pagotic-signature)
// - Reconfirma pagamento com PagoticService.getPaymentById()
// - Upsert Payment + atualização idempotente do Order
// - Logs de integridade (amount/currency)
// - Sem `any`; pronto para testes e reprocessamentos

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PagoticService } from "./pagotic.service";
import type {
  GetPaymentResponse} from "./pagotic.schema";
import {
  parseGetPaymentResponse,
  getNormalizedAmount,
  iso4217,
} from "./pagotic.schema";
import { PaymentProvider, PaymentStatus as DbPaymentStatus, OrderStatus } from "@prisma/client";

/* ----------------------------- Input Schema ------------------------------ */

export const PagoticWebhookBodySchema = z.object({
  id: z.string().min(1), // id do pagamento no PagoTIC
  external_transaction_id: z.string().min(1),
  status: z.string().min(1), // 'approved' | 'pending' | 'rejected' | ...
  final_amount: z.number().finite().optional(),
  currency_id: iso4217.optional(), // ISO 4217
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().optional(), // RFC 822 + TZ (se enviado)
  updated_at: z.string().optional(),
});
export type PagoticWebhookBody = z.infer<typeof PagoticWebhookBodySchema>;

/* ------------------------------ Auth header ------------------------------ */

export function isPagoticAuthorized(headers: Record<string, string> | Headers): boolean {
  const expected = process.env.PAGOTIC_WEBHOOK_SECRET;
  if (!expected) return true; // se não configurado, não bloqueia (configure em prod!)
  const get = (k: string) =>
    headers instanceof Headers ? headers.get(k) ?? "" : headers[k.toLowerCase()] ?? headers[k] ?? "";
  const got = get("x-pagotic-signature");
  return got === expected;
}

/* -------------------------- Status normalização -------------------------- */

export function normalizePaymentStatus(providerStatus: string): DbPaymentStatus {
  const s = providerStatus.toLowerCase();
  if (["approved", "success", "paid", "accredited"].includes(s)) return DbPaymentStatus.APPROVED;
  if (["pending", "in_process", "authorized", "issued", "review", "validate"].includes(s))
    return DbPaymentStatus.PENDING;
  if (["cancelled", "canceled", "refunded"].includes(s)) return DbPaymentStatus.CANCELLED;
  if (["overdue", "deferred", "objected"].includes(s)) return DbPaymentStatus.FAILED; // ajuste se quiser mapear para EXPIRED
  return DbPaymentStatus.FAILED; // rejected, error, etc.
}

export function orderStatusFromPayment(ps: DbPaymentStatus): OrderStatus {
  switch (ps) {
    case DbPaymentStatus.APPROVED:
      return OrderStatus.PAID;
    case DbPaymentStatus.PENDING:
      return OrderStatus.PENDING;
    case DbPaymentStatus.CANCELLED:
      return OrderStatus.CANCELLED;
    case DbPaymentStatus.FAILED:
    default:
      return OrderStatus.CANCELLED; // ajuste para EXPIRED se for sua política
  }
}

/* --------------------------- Utilidades locais --------------------------- */

function sumDetailsAmount(resp: GetPaymentResponse): number | undefined {
  if (!resp.details || resp.details.length === 0) return undefined;
  const sum = resp.details.reduce((acc, d) => acc + (typeof d.amount === "number" ? d.amount : 0), 0);
  return Number.isFinite(sum) ? sum : undefined;
}

/* --------------------------- Core do processamento --------------------------- */

export type ProcessPagoticWebhookResult =
  | { ok: true; ignored?: boolean }
  | { ok: false; status: number; error: string };

export async function processPagoticWebhook(
  bodyUnknown: unknown,
  headers: Record<string, string> | Headers,
  opts?: { logger?: Pick<Console, "info" | "warn" | "error" | "debug"> }
): Promise<ProcessPagoticWebhookResult> {
  const log = opts?.logger ?? console;

  // 1) Autorização opcional por header secreto
  if (!isPagoticAuthorized(headers)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  // 2) Validação de schema do webhook
  const body = PagoticWebhookBodySchema.parse(bodyUnknown);

  // 3) Reconfirmação com a API (anti-spoofing / fonte de verdade)
  const svc = new PagoticService(process.env, { logger: log, timeoutMs: 12000 });
  const providerPaymentRaw = await svc.getPaymentById(body.id);
  const paymentData = parseGetPaymentResponse(providerPaymentRaw);

  // 4) Status finais normalizados
  const finalPaymentStatus = normalizePaymentStatus(paymentData.status);
  const finalOrderStatus = orderStatusFromPayment(finalPaymentStatus);

  // 5) Localiza Order por external_transaction_id (que nós geramos de forma única)
  const order = await prisma.order.findUnique({
    where: { externalTransactionId: body.external_transaction_id },
    select: { id: true, status: true, total: true, payment: { select: { status: true } } },
  });
  if (!order) {
    log.warn("[PagoTIC Webhook] Order not found ext_tx_id:", body.external_transaction_id);
    // idempotente: OK para o provedor reentregar depois
    return { ok: true, ignored: true };
  }

  // 6) Integridade: currency e valores
  const envCurrency = (process.env.PAGOTIC_CURRENCY_ID ?? "ARS").toUpperCase();
  if (paymentData.details && paymentData.details.some((d) => d.currency_id !== envCurrency)) {
    log.warn("[PagoTIC Webhook] currency mismatch", {
      expected: envCurrency,
      got: paymentData.details.map((d) => d.currency_id),
      orderId: order.id,
    });
  }
  const normalizedAmount = getNormalizedAmount(paymentData, order.total);
  const detailsSum = sumDetailsAmount(paymentData);
  if (typeof detailsSum === "number" && Math.abs(detailsSum - normalizedAmount) > 0.01) {
    log.warn("[PagoTIC Webhook] amount mismatch", {
      normalizedAmount,
      detailsSum,
      orderTotal: order.total,
      orderId: order.id,
    });
  }

  // Idempotência: se já estiver no mesmo status de Payment/Order, não regrava
  const currentOrderStatus = order.status;
  const currentPaymentStatus = order.payment?.status;
  const noOrderStatusChange = currentOrderStatus === finalOrderStatus;
  const noPaymentStatusChange = currentPaymentStatus === finalPaymentStatus;

  if (noOrderStatusChange && noPaymentStatusChange) {
    log.debug?.("[PagoTIC Webhook] no-op (same statuses)", {
      orderId: order.id,
      status: finalOrderStatus,
    });
    return { ok: true, ignored: true };
  }

  // 7) Upsert Payment + atualização idempotente do Order
  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: PaymentProvider.PAGOTIC,
        status: finalPaymentStatus,
        amount: normalizedAmount,
        metadata: paymentData.metadata ? (paymentData.metadata as object) : undefined,
        rawResponse: paymentData as object, // auditoria
      },
      update: {
        status: finalPaymentStatus,
        amount: normalizedAmount,
        metadata: paymentData.metadata ? (paymentData.metadata as object) : undefined,
        rawResponse: paymentData as object,
      },
    });

    if (currentOrderStatus !== finalOrderStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: finalOrderStatus },
      });
    }
  });

  return { ok: true };
}
