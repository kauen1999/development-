// src/pages/api/webhooks/pagotic-return.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ext = (req.query?.external_transaction_id as string | undefined)
      ?? (typeof req.body === "object" && req.body ? (req.body as Record<string, string>).external_transaction_id : undefined);

    const orderId = ext?.toLowerCase().startsWith("order_") ? ext.slice(6) : undefined;
    const url = orderId
      ? `/checkout/confirmation?orderId=${encodeURIComponent(orderId)}`
      : `/checkout/confirmation`;

    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    res.status(200).send("ok");
  }
}
