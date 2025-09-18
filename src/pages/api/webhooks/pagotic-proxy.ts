// src/pages/api/webhooks/pagotic-proxy.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as qs from "querystring";
import { prisma } from "@/lib/prisma";
import type { Prisma, Ticket } from "@prisma/client";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import { normalizePagoticStatus } from "@/modules/pagotic/pagotic.utils";
import { webhookPayloadSchema } from "@/modules/pagotic/pagotic.schema";

export const config = { api: { bodyParser: false } };

type PagoTicNotification = {
  id?: string;
  payment_id?: string;
  paymentId?: string;
  status?: string;
  status_detail?: string;
  final_amount?: number;
  external_transaction_id?: string;
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
  return Buffer.concat(chunks).toString("utf8");
}

async function parseNotification(raw: string, ct: string): Promise<PagoTicNotification> {
  if (ct.includes("application/x-www-form-urlencoded")) {
    const parsed = qs.parse(raw);
    return {
      id: toStr(parsed.id) ?? toStr(parsed.payment_id) ?? toStr(parsed.paymentId),
      status: toStr(parsed.status),
      status_detail: toStr(parsed.status_detail),
      final_amount: parsed.final_amount ? Number(parsed.final_amount) : undefined,
      external_transaction_id: toStr(parsed.external_transaction_id),
      payment_number: toStr(parsed.payment_number),
    };
  }

  try {
    const json = JSON.parse(raw) as PagoTicNotification;
    return {
      ...json,
      id: json.id ?? json.payment_id ?? json.paymentId,
      external_transaction_id: json.external_transaction_id,
    };
  } catch {
    return {};
  }
}

// -------------------------
// Handler
// -------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await readRawBody(req);
  const ct = String(req.headers["content-type"] ?? "");
  res.status(200).json({ ok: true }); // ✅ ACK imediato

  (async () => {
    try {
      // 1) Parse bruto
      const rawParsed = await parseNotification(rawBody, ct);

      // 2) Validação Zod (igual ao webhook)
      const parsed = webhookPayloadSchema.safeParse(rawParsed);
      if (!parsed.success) {
        console.error("[PagoTIC][Proxy] Payload inválido:", parsed.error.flatten());
        return;
      }
      const body: PagoTicNotification = parsed.data;

      console.log("[PagoTIC][Proxy] Notificação recebida:", {
        id: body.id,
        status: body.status,
        ext: body.external_transaction_id,
        payment_number: body.payment_number,
      });

      // Extrair orderId
      const ext = body.external_transaction_id ?? "";
      if (!ext) return console.warn("[PagoTIC][Proxy] sem external_transaction_id");

      const orderId = resolveOrderIdFromExternal(ext);
      const nextStatus = normalizePagoticStatus(body.status);
      const paymentId = body.id ?? String(body.payment_number ?? "");

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) return console.error("[PagoTIC][Proxy] Order não encontrada:", orderId);

      // Evita downgrade / duplicado
      if (order.status === "PAID" && nextStatus === "PAID") return;

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          externalTransactionId: ext,
          paymentNumber: paymentId || order.paymentNumber,
        },
        include: { user: true, Event: true },
      });

      // Registrar tentativa de pagamento
      if (paymentId) {
        const attemptTag = `${paymentId}:${nextStatus}:${body.status_detail ?? ""}`;
        const exists = await prisma.paymentAttempt.findFirst({
          where: { payment: { orderId }, attemptTag },
          select: { id: true },
        });

        if (!exists) {
          await prisma.paymentAttempt.create({
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

      // Pós-pagamento
      if (nextStatus === "PAID") {
        try {
          const ticketsAll = await generateTicketsFromOrder(updated.id);
          const tickets = (ticketsAll as Ticket[]).filter(Boolean);
          if (updated.user?.email) {
            await sendTicketEmail(updated.user, updated.Event, tickets);
          }
        } catch (err) {
          console.error("[PagoTIC][Proxy] pós-pagamento falhou:", err);
        }
      }
    } catch (err) {
      console.error("[PagoTIC][Proxy] erro inesperado:", err);
    }
  })();
}
