import Stripe from "stripe";
import { prisma } from "@/server/db/client";
import { toJsonValue } from "@/utils/toJsonValue";
import { TRPCError } from "@trpc/server";
import { PaymentProvider, PaymentStatus, OrderStatus } from "@prisma/client";
import { generateTicketAssets } from "@/modules/ticket/ticketGeneration.service";
import { env } from "@/env/server.mjs";

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY is not defined in environment variables.");
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

// Create PaymentIntent with metadata
export async function createStripePayment(orderId: string, amount: number) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: "ars",
      metadata: { orderId },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client_secret.");
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        amount,
        rawResponse: toJsonValue(paymentIntent), // safe JSON
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  } catch (error) {
    console.error("❌ Failed to create Stripe payment:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create payment session.",
      cause: error,
    });
  }
}

// Stripe Webhook Handler
export async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type !== "payment_intent.succeeded") {
    console.log(`ℹ️ Unhandled Stripe event: ${event.type}`);
    return;
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  const orderId = intent?.metadata?.orderId;

  if (!orderId || typeof orderId !== "string") {
    console.warn("⚠️ Webhook missing metadata.orderId.");
    throw new Error("Invalid Stripe webhook: no orderId metadata.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          orderId,
          provider: PaymentProvider.STRIPE,
        },
        data: {
          status: PaymentStatus.APPROVED,
        },
      });

      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
        include: { user: true },
      });

      await generateTicketAssets(orderId, tx, {
        orderId,
        userName: order.user?.name ?? undefined,
      });

      console.log(`✅ Payment processed and tickets generated for order ${orderId}`);
    });
  } catch (err) {
    console.error("❌ Error processing Stripe webhook:", err);
    throw new Error("Stripe webhook processing failed.");
  }
}
