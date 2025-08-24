// src/pages/api/webhooks/pagotic-return.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("[PagoTIC][RETURN_URL] hit:", {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    // Tente extrair o orderId do external_transaction_id (se vier)
    const ext = (req.query?.external_transaction_id ?? req.body?.external_transaction_id) as string | undefined;
    const orderId = ext?.toLowerCase().startsWith("order_") ? ext.slice(6) : undefined;

    // Leva o usuário para a página que já existe no seu front
    const url = orderId
      ? `/checkout/confirmation?orderId=${encodeURIComponent(orderId)}`
      : `/checkout/confirmation`;

    // redireciona
    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    console.error("[PagoTIC][RETURN_URL] error:", (e as Error).message);
    res.status(200).send("ok");
  }
}
