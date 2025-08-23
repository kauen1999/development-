// src/moduls/pagotic/pagotic.webhook.ts
// Next.js API Route handler for PagoTIC notifications
import type { NextApiRequest, NextApiResponse } from "next";
import { webhookPayloadSchema } from "./pagotic.schema";

// IMPORTANT: PagoTIC sends the *full document* (same as a GET) to notification_url.
// You MUST return 200 quickly and process asynchronously if your app does heavy work.
export async function pagoticWebhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Basic validation (do not reject unknown fields)
  const parse = webhookPayloadSchema.safeParse(req.body);
  if (!parse.success) {
    // Always respond 200 to avoid retry storms, but log the issue.
    console.error("[PAGOTIC][WEBHOOK] invalid payload", parse.error.flatten());
    return res.status(200).json({ ok: true });
  }

  const payload = parse.data;

  // Idempotency tip: use payload.id + status as dedup key
  // TODO: check in your DB (WebhookLog) before processing.
  try {
    // Example branching - adapt to your domain:
    if (payload.status === "approved" || payload.paid_date) {
      // TODO: mark order as PAID, generate tickets, etc.
    }
    if (payload.status === "rejected") {
      // TODO: mark order as FAILED/REJECTED
    }
    if (payload.status === "cancelled") {
      // TODO: mark order as CANCELLED
    }
  } catch (e) {
    // Persist failure for replay
    console.error("[PAGOTIC][WEBHOOK] processing error", e);
  }

  // Always ack 200 to conform with provider’s retry/backoff policy
  return res.status(200).json({ ok: true });
}
