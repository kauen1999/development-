// src/pages/api/webhooks/pagotic-return.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { normalizePagoticStatus } from "@/modules/pagotic/pagotic.utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fallbacks para external_transaction_id
    const ext =
      (req.query?.external_transaction_id as string | undefined) ??
      (req.query?.externalId as string | undefined) ??
      (req.query?.ext_id as string | undefined) ??
      (typeof req.body === "object" && req.body
        ? (
            (req.body as Record<string, string>).external_transaction_id ||
            (req.body as Record<string, string>).externalId ||
            (req.body as Record<string, string>).ext_id
          )
        : undefined);

    // Fallbacks para status
    const statusRaw =
      (req.query?.status as string | undefined) ??
      (req.query?.statusCode as string | undefined) ??
      (req.query?.state as string | undefined) ??
      (typeof req.body === "object" && req.body
        ? (
            (req.body as Record<string, string>).status ||
            (req.body as Record<string, string>).statusCode ||
            (req.body as Record<string, string>).state
          )
        : undefined);

    // Resolve orderId
    const orderId = ext?.toLowerCase().startsWith("order_")
      ? ext.slice(6)
      : undefined;

    // Normaliza status com função unificada
    const normalized = normalizePagoticStatus(statusRaw);

    let url: string;
    if (normalized === "PAID") {
      url = `${BASE_URL}/checkout/confirmation${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`;
    } else {
      url = `${BASE_URL}/checkout/failed${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ""}`;
    }

    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    console.error("[PagoTIC][Return] erro inesperado:", e);
    res.status(200).send("ok");
  }
}
