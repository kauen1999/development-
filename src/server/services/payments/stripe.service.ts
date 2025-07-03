import Stripe from "stripe";
import { prisma } from "@/server/db/client";
import { toJsonValue } from "@/utils/toJsonValue";
import { TRPCError } from "@trpc/server";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { generateTicketAssets } from "@/server/services/ticket/ticketGeneration.service";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

/**
 * Cria um pagamento com Stripe e registra no banco
 */
export async function createStripePayment(orderId: string, amount: number) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: "ars", // altere se necessário
      metadata: { orderId },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.PENDING,
        amount,
        rawResponse: toJsonValue(paymentIntent),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  } catch (error) {
    console.error("Erro ao criar pagamento com Stripe", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro ao criar pagamento com Stripe",
      cause: error,
    });
  }
}

/**
 * Lida com eventos do webhook do Stripe
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        console.error("❌ Webhook recebido sem metadata.orderId");
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId, provider: PaymentProvider.STRIPE },
          data: { status: PaymentStatus.APPROVED },
        });

        const order = await tx.order.update({
          where: { id: orderId },
          data: { status: "PAID" },
          include: { user: true },
        });

        await generateTicketAssets(orderId, tx, {
          orderId,
          userName: order.user?.name ?? undefined,
        });
      });

      console.log(`✅ Pagamento aprovado e tickets gerados para o pedido ${orderId}`);
      break;
    }

    default:
      console.log(`ℹ️ Webhook recebido de tipo não tratado: ${event.type}`);
  }
}
