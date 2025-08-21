import { router, protectedProcedure } from "@/server/trpc/trpc";
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
} from "./order.service";

export const orderRouter = router({
  // usado em eventos "GENERAL"
  createGeneral: protectedProcedure
    .input(createOrderGeneralInput)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      return createOrderGeneralService(
        userId,
        input.eventId,
        input.eventSessionId,
        input.items,
      );
    }),

  // usado em eventos "SEATED"
  createSeated: protectedProcedure
    .input(createOrderSeatedInput)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      return createOrderSeatedService(
        userId,
        input.eventId,
        input.eventSessionId,
        input.seatIds,
      );
    }),

  getOrder: protectedProcedure
    .input(getOrderInput)
    .query(async ({ input }) => getOrderByIdService(input.id)),

  listOrders: protectedProcedure
    .input(listOrdersInput)
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");
      return listOrdersService(userId, input.page, input.limit);
    }),

  cancelOrder: protectedProcedure
    .input(cancelOrderInput)
    .mutation(async ({ input }) => cancelOrderService(input.id)),
});
