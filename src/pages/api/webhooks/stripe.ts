// src/pages/api/webhooks/stripe.ts
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/server/lib/stripe";
import { handleStripeWebhook } from "@/server/services/payments/stripe.service";
import { env } from "@/env";
import type Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false, // necessário para leitura do rawBody
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("Missing or invalid Stripe signature header");
  }

  let event: Stripe.Event;
  const rawBody = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(
      rawBody, // 🔒 mantém como Buffer
      sig,
      env.server.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("❌ Erro ao verificar assinatura Stripe:", msg);
    return res.status(400).send(`Webhook signature verification failed: ${msg}`);
  }

  try {
    await handleStripeWebhook(event);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Erro interno ao processar webhook:", err);
    return res.status(500).send("Erro interno ao processar webhook");
  }
}
