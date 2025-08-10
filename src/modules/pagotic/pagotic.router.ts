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
        // 🔹 Busca o pedido por ID único
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

        // 🔹 Verifica se existe e pertence ao usuário logado
        if (!order || order.userId !== userId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
        }

        // 🔹 Busca usuário
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
        }

        // 🔹 Gera payload para PagoTIC
        const payload = buildPagoPayload(order, user);

        // 🔹 Garante que payment_number existe
        if (!payload.payment_number || payload.payment_number.trim() === "") {
          payload.payment_number = `PAY-${order.id}`;
        }

        // 🔹 Log para debug
        console.log("[PagoTIC] Payload enviado:", JSON.stringify(payload, null, 2));

        // 🔹 Cria pagamento na API PagoTIC
        const providerRes = (await pagoticService.createPayment(payload)) as ProviderResShape;

        const providerId = providerRes.id ?? null;
        const checkoutUrl = providerRes.checkout_url ?? providerRes.form_url;
        if (!checkoutUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "URL de checkout não retornada pelo provedor.",
          });
        }

        // 🔹 Salva no banco
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
