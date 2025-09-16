// src/pages/api/webhooks/pagotic-proxy.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as qs from "querystring";
import { prisma } from "@/lib/prisma";
import { generateTicketsFromOrder } from "@/modules/ticket/ticket.service";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { Ticket } from "@prisma/client";
import { reconcileOrderByPaymentId } from "@/modules/pagotic/pagotic.reconcile";
import { normalizePagoticStatus, withTimeout } from "@/modules/pagotic/pagotic.utils";

export const config = {
  api: { bodyParser: false },
  regions: ["gru1"], // força execução no Brasil
};

type PagoTicNotification = {
  id?: string;
  payment_id?: string;
  paymentId?: string;
  status?: string;
  final_amount?: number;
  currency?: string;
  collector?: string;
  external_transaction_id?: string;
  externalId?: string;
  ext_id?: string;
  metadata?: string | Record<string, string | number | boolean | null>;
  payment_number?: string | number | null;
};

// ------------------------
// Helpers
// ------------------------
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
      id:
        toStr(parsed.id as string | string[] | undefined) ??
        toStr(parsed.payment_id as string | string[] | undefined) ??
        toStr(parsed.paymentId as string | string[] | undefined),
      status: toStr(parsed.status as string | string[] | undefined),
      final_amount: parsed.final_amount ? Number(parsed.final_amount) : undefined,
      currency: toStr(parsed.currency as string | string[] | undefined),
      collector: toStr(parsed.collector as string | string[] | undefined),
      external_transaction_id:
        toStr(parsed.external_transaction_id as string | string[] | undefined) ??
        toStr(parsed.externalId as string | string[] | undefined) ??
        toStr(parsed.ext_id as string | string[] | undefined),
      payment_number: toStr(parsed.payment_number as string | string[] | undefined),
      metadata: toStr(parsed.metadata as string | string[] | undefined) ?? {},
    };
  }

  try {
    const json = JSON.parse(raw) as PagoTicNotification;
    return {
      ...json,
      id: json.id ?? json.payment_id ?? json.paymentId,
      external_transaction_id: json.external_transaction_id ?? json.externalId ?? json.ext_id,
    };
  } catch {
    return {};
  }
}

// ------------------------
// Retry para reenvio CMS
// ------------------------
async function resendCms(rawBody: string, contentType: string | undefined) {
  const url = "https://app.cmsargentina.com/acquisition/v2/notify";
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.info(`[PagoTIC][Proxy] CMS → tentativa ${attempt}/${maxAttempts}`);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType || "application/json" },
        body: rawBody,
        signal: withTimeout(30000),
      });
      return true;
    } catch (err) {
      console.error(`[PagoTIC][Proxy] CMS falhou (tentativa ${attempt}):`, err);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return false;
}

// ------------------------
// Handler principal
// ------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, method: req.method });
  }

  // 🔹 responde imediatamente para evitar timeout
  res.status(200).json({ ok: true });

  // 🔹 processa notificação em background
  (async () => {
    try {
      const rawBody = await readRawBody(req);
      const ct = String(req.headers["content-type"] ?? "");
      const body = await parseNotification(rawBody, ct);

      // 1) repassa para CMS sem bloquear
      resendCms(rawBody, ct).catch((err) =>
        console.error("[PagoTIC][Proxy] CMS erro:", err),
      );

      // 2) valida collector
      const expectedCollector = process.env.PAGOTIC_COLLECTOR_ID;
      if (expectedCollector && body.collector && body.collector !== expectedCollector) {
        console.warn("[PagoTIC][Proxy] Collector inválido", {
          got: body.collector,
          expected: expectedCollector,
        });
        return;
      }

      // 3) extrai dados
      const ext = body.external_transaction_id ?? "";
      if (!ext) {
        console.warn("[PagoTIC][Proxy] sem external_transaction_id, pedido segue pendente");
        return;
      }
      const orderId = resolveOrderIdFromExternal(ext);
      const nextStatus = normalizePagoticStatus(body.status);
      const paymentId =
        body.id ??
        (typeof body.payment_number === "string"
          ? body.payment_number
          : String(body.payment_number ?? ""));

      // 4) busca order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, Event: true },
      });
      if (!order) {
        console.error("[PagoTIC][Proxy] Order não encontrada:", orderId);
        return;
      }

      // 5) idempotência
      if (order.status === "PAID" && nextStatus === "PAID") return;

      // 6) atualiza status
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          externalTransactionId: ext,
          paymentNumber: paymentId || order.paymentNumber,
        },
        include: { user: true, Event: true },
      });

      // 7) se pago → gera tickets e envia email
      if (nextStatus === "PAID") {
        try {
          const ticketsAll = await generateTicketsFromOrder(updated.id);
          const tickets = (ticketsAll as Ticket[]).filter(Boolean);
          if (updated.user?.email) {
            await sendTicketEmail(updated.user, updated.Event, tickets);
          }
        } catch (e) {
          console.error("[PagoTIC][Proxy] pós-pagamento falhou:", e);
        }
      }

      // 8) reconcile como segurança
      if (paymentId) {
        reconcileOrderByPaymentId(paymentId).catch((err) =>
          console.error("[PagoTIC][Proxy] reconcile error:", err),
        );
      }
    } catch (e) {
      console.error("[PagoTIC][Proxy] erro inesperado:", e);
    }
  })();
}
