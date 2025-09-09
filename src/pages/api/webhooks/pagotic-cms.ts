// src/pages/api/webhooks/pagotic-cms.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as qs from "querystring";
import { reconcileOrderByPaymentId } from "@/modules/pagotic/pagotic.reconcile";

export const runtime = "nodejs";
export const config = { api: { bodyParser: false } };

type CMSWebhookBody = {
  id?: string;
  payment_id?: string;
  paymentId?: string;
  external_transaction_id?: string;
  externalId?: string;
  status?: string;
  [k: string]: unknown;
};

async function readRaw(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  let body: CMSWebhookBody = {};
  try {
    const ct = String(req.headers["content-type"] ?? "");
    const raw = await readRaw(req);

    console.log("[CMS][webhook] raw recebido:", raw);

    if (ct.includes("application/x-www-form-urlencoded")) {
      const parsed = qs.parse(raw);
      body = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, typeof v === "string" ? v : String(v)])
      ) as CMSWebhookBody;
    } else if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") body = parsed as CMSWebhookBody;
    }
  } catch (e) {
    console.error("[CMS][webhook] parse error:", (e as Error).message);
  }

  console.log("[CMS][webhook] body parseado:", body);

  const paymentIdRaw = body.id ?? body.payment_id ?? body.paymentId ?? "";
  const paymentId =
    typeof paymentIdRaw === "string" && paymentIdRaw.trim() ? paymentIdRaw.trim() : undefined;

  const externalRaw = body.external_transaction_id ?? body.externalId ?? "";
  const external =
    typeof externalRaw === "string" && externalRaw.trim() ? externalRaw.trim() : undefined;

  try {
    if (paymentId) {
      console.log("[CMS][webhook] reconciliando por paymentId:", paymentId);
      await reconcileOrderByPaymentId(paymentId);
    } else if (external) {
      console.warn("[CMS][webhook] veio apenas external_transaction_id (sem paymentId):", external);
      // Se quiser, aqui você pode buscar a Order por external e, do seu DB, obter o paymentNumber e chamar o reconcile
    } else {
      console.warn("[CMS][webhook] não veio id nem external_transaction_id");
    }
  } catch (e) {
    console.error("[CMS][webhook] reconcile error:", (e as Error).message);
  }

  return res.status(200).json({ ok: true });
}

