// src/server/routers/payment.router.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { createPayment } from "@/server/services/payment.service";

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["STRIPE"]),
        orderId: z.string().min(1),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const { provider, orderId, amount } = input;
      return createPayment(provider, orderId, amount);
    }),
});
