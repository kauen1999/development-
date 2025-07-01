import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createOrderSchema, getOrderSchema, listOrdersSchema } from "../../schema/order.schema";
import { createOrderService, getOrderByIdService, listOrdersService } from "../../services/order.service";

export const orderRouter = createTRPCRouter({
  createOrder: protectedProcedure
    .input(createOrderSchema)
    .mutation(({ ctx, input }) => {
      return createOrderService(input, ctx.session.user.id);
    }),

  getOrder: protectedProcedure
    .input(getOrderSchema)
    .query(({ input }) => {
      return getOrderByIdService(input.id);
    }),

  listOrders: protectedProcedure
    .input(listOrdersSchema)
    .query(({ ctx, input }) => {
      return listOrdersService(ctx.session.user.id, input.skip, input.take);
    }),
});
