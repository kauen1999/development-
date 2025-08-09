// src/pages/api/webhooks/pagotic.ts
import type { NextApiRequest, NextApiResponse } from "next";
import handlePagoTICWebhook from "@/modules/pagotic/pagotic.webhook";

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return handlePagoTICWebhook(req, res);
}
