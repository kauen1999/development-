// src/pages/api/webhooks/pagotic-proxy.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as qs from "querystring";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import { normalizePagoticStatus, withTimeout } from "@/modules/pagotic/pagotic.utils";
import { reconcileOrderByPaymentId } from "@/modules/pagotic/pagotic.reconcile";

export const config = {
  api: { bodyParser: false },
  regions: ["gru1"],
};

const MAX_PAYLOAD_SIZE = 1e6; // ~1MB

type PagoTicNotification = {
  id?: string;
  payment_id?: string;
  paymentId?: string;
  status?: string;
  status_detail?: string;
  final_amount?: number;
  currency?: string;
  collector?: string;
  external_transaction_id?: string;
  externalId?: string;
  ext_id?: string;
  metadata?: string | Record<string, string | number | boolean | null>;
  payment_number?: string | number | null;
};

// -------------------------
// Helpers
// -------------------------
function toStr(v: string | string[] | number | undefined | null): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function resolveOrderIdFromExternal(externalId: string): string {
  return externalId.toLowerCase().startsWith("order_") ? externalId.slice(6) : externalId;
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");

  if (raw.length > MAX_PAYLOAD_SIZE) {
    throw new Error("[PagoTIC][Proxy] Payload muito grande");
  }
  return raw;
}

function logSafe(body: Partial<PagoTicNotification>) {
  const { id, status, status_detail, external_transaction_id, payment_number } = body;
  console.log("[PagoTIC][Proxy] Notificação recebida:", {
    id,
    status,
    status_detail,
    external_transaction_id,
    payment_number,
  });
}

async function parseNotification(raw: string, ct: string): Promise<PagoTicNotification> {
  if (ct.includes("application/x-www-form-urlencoded")) {
    const parsed = qs.parse(raw);
    return {
      id: toStr(parsed.id) ?? toStr(parsed.payment_id) ?? toStr(parsed.paymentId),
      status: toStr(parsed.status),
      status_detail: toStr(parsed.status_detail),
      final_amount: parsed.final_amount ? Number(parsed.final_amount) : undefined,
      currency: toStr(parsed.currency),
      collector: toStr(parsed.collector),
      external_transaction_id:
        toStr(parsed.external_transaction_id) ?? toStr(parsed.externalId) ?? toStr(parsed.ext_id),
      payment_number: toStr(parsed.payment_number),
      metadata: typeof parsed.metadata === "string" ? parsed.metadata : undefined,
    };
  }

  try {
    const json = JSON.parse(raw) as PagoTicNotification;
    return {
      ...json,
      id: json.id ?? json.payment_id ?? json.paymentId,
      external_transaction_id: json.external_transaction_id ?? json.externalId ?? json.ext_id,
    };
  } catch (err) {
    console.error("[PagoTIC][Proxy] erro parseando JSON:", err);
    return {};
  }
}

// -------------------------
// Status Transition Guard
// -------------------------
function isValidTransition(current: string, next: string): boolean {
  const allowed: Record<string, string[]> = {
    PENDING: ["PAID", "CANCELLED", "EXPIRED"],
    PAID: [], // não volta
    CANCELLED: [], // não volta
    EXPIRED: [], // não volta
  };
  return allowed[current]?.includes(next) ?? false;
}

// -------------------------
// CMS Proxy
// -------------------------
async function resendCms(rawBody: string, contentType: string | undefined) {
  const url = "https://app.cmsargentina.com/acquisition/v2/notify";
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType || "application/json" },
        body: rawBody,
        signal: withTimeout(15000),
      });
      return true;
    } catch (err) {
      console.error(`[PagoTIC][Proxy] CMS falhou (tentativa ${attempt}):`, err);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return false;
}

// -------------------------
// Handler
// -------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(200).json({ ok: true, method: req.method });

  const rawBody = await readRawBody(req);
  const ct = String(req.headers["content-type"] ?? "");

  res.status(200).json({ ok: true }); // ACK imediato

  (async () => {
    try {
      const body = await parseNotification(rawBody, ct);
      logSafe(body);

      void resendCms(rawBody, ct).then((ok) => {
        if (!ok) console.error("[PagoTIC][Proxy] CMS segue com falha após tentativas.");
      });

      const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
      if (!expectedCollector) {
        console.error("[PagoTIC][Proxy] Collector esperado não configurado");
        return;
      }
      if (body.collector && body.collector !== expectedCollector) {
        console.warn("[PagoTIC][Proxy] Collector inválido", { got: body.collector });
        return;
      }

      const ext = body.external_transaction_id ?? "";
      if (!ext) {
        console.warn("[PagoTIC][Proxy] sem external_transaction_id, pedido segue pendente");
        return;
      }
      const orderId = resolveOrderIdFromExternal(ext);
      const nextStatus = normalizePagoticStatus(body.status);
      const paymentId = body.id ?? String(body.payment_number ?? "");

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) {
        console.error("[PagoTIC][Proxy] Order não encontrada:", orderId);
        return;
      }

      if (order.status === "PAID" && nextStatus === "PAID") return;
      if (!isValidTransition(order.status, nextStatus)) {
        console.warn("[PagoTIC][Proxy] Transição inválida", { current: order.status, next: nextStatus });
        return;
      }

      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: nextStatus,
            externalTransactionId: ext,
            paymentNumber: paymentId || order.paymentNumber,
          },
          include: { user: true, Event: true },
        });

        if (paymentId) {
          const attemptTag = `${paymentId}:${nextStatus}:${body.status_detail ?? ""}`;
          const exists = await tx.paymentAttempt.findFirst({
            where: { payment: { orderId }, attemptTag },
            select: { id: true },
          });

          if (!exists) {
            await tx.paymentAttempt.create({
              data: {
                attemptTag,
                payment: {
                  connectOrCreate: {
                    where: { orderId },
                    create: {
                      orderId,
                      provider: "PAGOTIC",
                      status:
                        nextStatus === "PAID"
                          ? "APPROVED"
                          : nextStatus === "CANCELLED"
                          ? "FAILED"
                          : "PENDING",
                      amount: body.final_amount ?? order.total,
                      rawResponse: body as Prisma.InputJsonValue,
                    },
                  },
                },
                status:
                  nextStatus === "PAID"
                    ? "APPROVED"
                    : nextStatus === "CANCELLED"
                    ? "FAILED"
                    : "PENDING",
                detail: body.status_detail ?? null,
                rawResponse: body as Prisma.InputJsonValue,
              },
            });
          }
        }

        if (nextStatus === "PAID") {
          try {
            const ticketsAll = await generateTicketsFromOrder(updated.id);
            const tickets = (ticketsAll as Ticket[]).filter(Boolean);
            if (updated.user?.email) {
              for (let i = 0; i < 3; i++) {
                try {
                  await sendTicketEmail(updated.user, updated.Event, tickets);
                  break;
                } catch (err) {
                  if (i === 2) throw err;
                  await new Promise((r) => setTimeout(r, 2000));
                }
              }
            }
          } catch (err) {
            console.error("[PagoTIC][Proxy] Falha no pós-pagamento:", err);
          }
        }
      });

      if (paymentId) {
        reconcileOrderByPaymentId(paymentId).catch((err) =>
          console.error("[PagoTIC][Proxy] reconcile error:", err),
        );
      }
    } catch (err) {
      console.error("[PagoTIC][Proxy] erro inesperado:", err);
    }
  })();
}
