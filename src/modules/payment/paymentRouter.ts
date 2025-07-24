import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { createPayment } from "@/modules/payment/payment.service";
import { z } from "zod";

const createPaymentSchema = z.object({
  provider: z.enum(["STRIPE"]),
  orderId: z.string().min(1),
  amount: z.number().positive(),
});

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createPaymentSchema)
    .mutation(async ({ input }) => {
      return createPayment(input.provider, input.orderId, input.amount);
    }),
});
