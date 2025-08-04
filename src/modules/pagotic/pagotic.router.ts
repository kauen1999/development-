import { protectedProcedure, router } from "@/server/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pagoticService } from "./pagotic.service";
import { buildPagoPayload } from "./pagotic.payload";

export const pagoticRouter = router({
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;
      const userId = ctx.session.user.id;

      const order = await prisma.order.findUnique({
        where: { id: orderId, userId },
        include: {
          orderItems: {
            include: {
              seat: { include: { ticketCategory: true } },
            },
          },
        },
      });
      if (!order) throw new Error("Pedido não encontrado.");

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("Usuário não encontrado.");

      const payload = buildPagoPayload(order, user);
      const response = await pagoticService.createPayment(payload);

      await prisma.order.update({
        where: { id: order.id },
        data: { externalTransactionId: payload.external_transaction_id },
      });

      return { form_url: response.form_url };
    }),
});
