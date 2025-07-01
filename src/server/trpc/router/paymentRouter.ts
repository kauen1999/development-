import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/trpc/trpc';
import { createStripePayment } from '@/server/services/payment.service';

// Zod schema para criar pagamento
const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
});

export const paymentRouter = createTRPCRouter({
  // Criação de pagamento Stripe
  createStripe: protectedProcedure
    .input(createPaymentSchema)
    .mutation(async ({ input }) => {
      const { orderId, amount } = input;
      const intent = await createStripePayment(orderId, amount);
      return {
        clientSecret: intent.client_secret,
        status: intent.status,
      };
    }),
});
