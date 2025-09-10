// src/pages/api/webhooks/pagotic-return.ts
import type { NextApiRequest, NextApiResponse } from "next";

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

    const status = (statusRaw ?? "").toLowerCase().trim();

    const orderId = ext?.toLowerCase().startsWith("order_")
      ? ext.slice(6)
      : undefined;

    // Decide rota com base no status
    let url: string;
    if (["rejected", "cancelled", "canceled", "failed"].includes(status)) {
      url = orderId
        ? `/checkout/failed?orderId=${encodeURIComponent(orderId)}`
        : `/checkout/failed`;
    } else {
      url = orderId
        ? `/checkout/confirmation?orderId=${encodeURIComponent(orderId)}`
        : `/checkout/confirmation`;
    }

    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    res.status(200).send("ok");
  }
}
