// src/modules/pagotic/pagotic.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pagoticService } from "./pagotic.service";
import { buildPagoPayload } from "./pagotic.payload";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { PaymentProvider, PaymentStatus } from "@prisma/client";

export const pagoticRouter = router({
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { orderId } = input;
      const userId = ctx.session.user.id;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              seat: { include: { ticketCategory: true } },
            },
          },
          event: true,
        },
      });

      if (!order || order.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }

      if (!order.paymentNumber) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentNumber: `PAY-${order.id}` },
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });

      const payload = await buildPagoPayload(order, user);

      const providerRes = await pagoticService.createPayment(payload);
      const providerId = providerRes.id ?? null;
      const checkoutUrl = providerRes.checkout_url ?? providerRes.form_url;

      if (!checkoutUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "URL de checkout não retornada pelo provedor.",
        });
      }

      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { externalTransactionId: payload.external_transaction_id },
        }),
        prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            provider: PaymentProvider.PAGOTIC,
            status: PaymentStatus.PENDING,
            amount: order.total,
            metadata: {
              external_transaction_id: payload.external_transaction_id,
              provider_payment_id: providerId,
            } as Prisma.InputJsonValue,
            rawResponse: providerRes as Prisma.InputJsonValue,
          },
          update: {
            status: PaymentStatus.PENDING,
            amount: order.total,
            metadata: {
              external_transaction_id: payload.external_transaction_id,
              provider_payment_id: providerId,
            } as Prisma.InputJsonValue,
            rawResponse: providerRes as Prisma.InputJsonValue,
          },
        }),
      ]);

      return { checkoutUrl, providerPaymentId: providerId };
    }),
});
