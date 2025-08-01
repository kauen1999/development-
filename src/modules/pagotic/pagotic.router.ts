import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { PagoTICService, createPagoSchema } from "./pagotic.service";
import { buildPagoPayload } from "./pagotic.payload";
import { prisma } from "@/lib/prisma";

export const pagoticRouter = router({
  createPayment: protectedProcedure
    .input(createPagoSchema)
    .mutation(async ({ input }) => {
      return await PagoTICService.createPayment(input);
    }),

  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized access to order");
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const payload = buildPagoPayload({ order, user });
      return await PagoTICService.createPayment(payload);
    }),
});
