import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pagoticService } from "./pagotic.service";
import { buildPagoPayload } from "./pagotic.payload";
import type { AxiosError } from "axios";

export const pagoticRouter = router({
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;
      const userId = ctx.session.user.id;

      try {
        console.log("[PagoTIC] Iniciando pagamento para Order ID:", orderId);

        const order = await prisma.order.findFirst({
          where: { id: orderId, userId },
          include: {
            orderItems: {
              include: {
                seat: {
                  include: {
                    ticketCategory: true,
                  },
                },
              },
            },
          },
        });

        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
        }

        const payload = buildPagoPayload(order, user);

        console.log("[PagoTIC] Payload enviado:", JSON.stringify(payload, null, 2));

        const result = await pagoticService.createPayment(payload);

        console.log("[PagoTIC] Resposta recebida:", result);

        return result;
      } catch (error) {
        const err = error as AxiosError;

        const status = err.response?.status ?? 500;
        const data = err.response?.data;

        console.error("[PagoTIC] Erro no pagamento:", data || err.message);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ${status} ao iniciar pagamento com PagoTIC`,
          cause: data || err.message,
        });
      }
    }),
});
