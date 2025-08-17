import { router, protectedProcedure } from "@/server/trpc/trpc";
import {
  createOrderSchema,
  createOrderGeneralSchema,
} from "./order.schema";
import {
  createOrderService,
  createGeneralOrderService,
  getOrderByIdService,
} from "./order.service";
import z from "zod";

export const orderRouter = router({
  // SEATED: cria pedido reservando assentos existentes por label (ex.: "A-3")
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createOrderService(input, ctx.session.user.id);
      } catch (err) {
        console.error("❌ Erro ao criar pedido (SEATED):", err);
        throw err;
      }
    }),

  // GENERAL: cria pedido por categorias (sem assentos), respeitando capacidade e limite de 5 ingressos
  createGeneral: protectedProcedure
    .input(createOrderGeneralSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createGeneralOrderService(input, ctx.session.user.id);
      } catch (err) {
        console.error("❌ Erro ao criar pedido (GENERAL):", err);
        throw err;
      }
    }),

  getOrderById: protectedProcedure
    .input(z.object({ orderId: z.string().cuid("Invalid order ID") }))
    .query(({ input, ctx }) =>
      getOrderByIdService(input.orderId, ctx.session.user.id)
    ),
});
