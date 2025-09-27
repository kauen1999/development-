import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  getOrderInput,
  listOrdersInput,
  cancelOrderInput,
  createOrderGeneralInput,
  createOrderSeatedInput,
} from "./order.schema";
import {
  getOrderByIdService,
  listOrdersService,
  cancelOrderService,
  createOrderGeneralService,
  createOrderSeatedService,
  createOrderFromCartService,
} from "./order.service";

function requireUser(ctx: unknown): string {
  const id = (ctx as { session?: { user?: { id?: string } } })?.session?.user?.id;
  if (!id) throw new TRPCError({ code: "UNAUTHORIZED" });
  return id;
}

export const orderRouter = router({
  // ───────── General tickets (sem assento) ─────────
  createGeneral: protectedProcedure
    .input(createOrderGeneralInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return createOrderGeneralService(
        userId,
        input.eventId,
        input.eventSessionId,
        input.items,
      );
    }),

  // ───────── Seated tickets (com assento) ─────────
  createSeated: protectedProcedure
    .input(createOrderSeatedInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return createOrderSeatedService(
        userId,
        input.eventId,
        input.eventSessionId,
        input.seatIds,
      );
    }),

  // ───────── Criar pedido a partir do carrinho ─────────
  // 👉 Já cria o pedido, inicia pagamento e só depois limpa o cart
  createFromCart: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = requireUser(ctx);
      return createOrderFromCartService(userId);
    }),

  // ───────── Consultas ─────────
  getOrder: protectedProcedure
    .input(getOrderInput)
    .query(async ({ input }) => getOrderByIdService(input.id)),

  listOrders: protectedProcedure
    .input(listOrdersInput)
    .query(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return listOrdersService(userId, input.page, input.limit);
    }),

  // ───────── Cancelamento ─────────
  cancelOrder: protectedProcedure
    .input(cancelOrderInput)
    .mutation(async ({ input }) => cancelOrderService(input.id)),
});
