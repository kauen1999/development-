// src/pages/api/webhooks/pagotic-return.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { normalizePagoticStatus } from "@/modules/pagotic/pagotic.utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ext =
      (req.query?.external_transaction_id as string | undefined) ??
      (typeof req.body === "object" && req.body
        ? (req.body as Record<string, string>).external_transaction_id
        : undefined);

    const statusRaw =
      (req.query?.status as string | undefined) ??
      (typeof req.body === "object" && req.body
        ? (req.body as Record<string, string>).status
        : undefined);

    const orderId = ext?.toLowerCase().startsWith("order_")
      ? ext.slice(6)
      : undefined;

    // Usa função unificada
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
