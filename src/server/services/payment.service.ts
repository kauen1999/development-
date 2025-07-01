import { prisma } from '../db/client';
import { logger } from '../logging';
import Stripe from 'stripe';
import { toJsonValue } from '../../utils/toJsonValue'; // ajuste o path conforme sua estrutura

// Validação de STRIPE_SECRET_KEY
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment');
}

// Instância do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

// Criação do pagamento via Stripe
export async function createStripePayment(orderId: string, amount: number) {
  logger.debug({ orderId, amount }, 'Creating Stripe PaymentIntent');

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe usa centavos
    currency: 'usd',
    metadata: { orderId },
  });

  await prisma.payment.create({
    data: {
      orderId,
      provider: 'STRIPE',
      status: intent.status,
      amount,
      rawResponse: toJsonValue(intent),
    },
  });

  return intent;
}

// Webhook do Stripe
export async function handleStripeWebhook(event: Stripe.Event) {
  if (
    event.type !== 'payment_intent.succeeded' &&
    event.type !== 'payment_intent.payment_failed'
  ) {
    logger.warn({ type: event.type }, 'Unhandled Stripe webhook type');
    return;
  }

  const data = event.data.object as Stripe.PaymentIntent;
  const orderId = data.metadata?.orderId;
  const status = data.status;

  logger.info({ orderId, status }, 'Stripe webhook received');

  if (!orderId) {
    throw new Error('Missing orderId in metadata');
  }

  await prisma.payment.updateMany({
    where: { orderId },
    data: {
      status,
      rawResponse: toJsonValue(event),
    },
  });

  if (status === 'succeeded') {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });
  }
}
