// src/modules/pagotic/pagotic.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pagoticService } from "./pagotic.service";
import { buildPagoPayload } from "./pagotic.payload";
import type { AxiosError } from "axios";
import type { Prisma } from "@prisma/client";
import { PaymentProvider, PaymentStatus } from "@prisma/client";

type ProviderResShape = {
  id?: string;
  checkout_url?: string;
  form_url?: string;
  [k: string]: unknown;
};

export const pagoticRouter = router({
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;
      const userId = ctx.session.user.id;

      try {
        // Busca o pedido
        let order = await prisma.order.findUnique({
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

        // Se não tiver paymentNumber, cria e salva no banco
        if (!order.paymentNumber) {
          const newPaymentNumber = `PAY-${order.id}`;
          order = await prisma.order.update({
            where: { id: order.id },
            data: { paymentNumber: newPaymentNumber },
            include: {
              orderItems: {
                include: {
                  seat: { include: { ticketCategory: true } },
                },
              },
              event: true,
            },
          });
          console.log(`[PagoTIC] paymentNumber gerado e salvo: ${newPaymentNumber}`);
        }

        // Busca usuário
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
        }

        // ✅ Gera payload aguardando o resultado
        const payload = await buildPagoPayload(order, user);

        console.log("[PagoTIC] Payload (sanitized)", {
          external_transaction_id: payload.external_transaction_id,
          detailsCount: payload.details?.length ?? 0,
          payerEmail: payload.payer?.email ?? null,
          return_url: payload.return_url,
          back_url: payload.back_url,
          notification_url: payload.notification_url,
          due_date: payload.due_date,
          last_due_date: payload.last_due_date,
        });

        // ✅ Cria pagamento na API PagoTIC
        const providerRes = (await pagoticService.createPayment(payload)) as ProviderResShape;

        const providerId = providerRes.id ?? null;
        const checkoutUrl = providerRes.checkout_url ?? providerRes.form_url;
        if (!checkoutUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "URL de checkout não retornada pelo provedor.",
          });
        }

        // Salva no banco
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { externalTransactionId: payload.external_transaction_id },
          });

          await tx.payment.upsert({
            where: { orderId: order.id },
            create: {
              orderId: order.id,
              provider: PaymentProvider.PAGOTIC,
              status: PaymentStatus.PENDING,
              amount: order.total,
              metadata: {
                external_transaction_id: payload.external_transaction_id,
                provider_payment_id: providerId,
              } as unknown as Prisma.InputJsonValue,
              rawResponse: providerRes as unknown as Prisma.InputJsonValue,
            },
            update: {
              status: PaymentStatus.PENDING,
              amount: order.total,
              metadata: {
                external_transaction_id: payload.external_transaction_id,
                provider_payment_id: providerId,
              } as unknown as Prisma.InputJsonValue,
              rawResponse: providerRes as unknown as Prisma.InputJsonValue,
            },
          });
        });

        return { checkoutUrl, providerPaymentId: providerId };
      } catch (e) {
        const err = e as AxiosError;
        console.error("[PagoTIC] startPagoTICPayment error:", err.response?.data ?? err.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao iniciar o pagamento com PagoTIC",
          cause: err.response?.data ?? err.message,
        });
      }
    }),
});
