// src/server/lib/stripe.ts
import Stripe from "stripe";
import { env } from "@/env/server.mjs";

const stripeSecretKey = env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
