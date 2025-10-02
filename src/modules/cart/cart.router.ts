//src/modules/cart/cart.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  addToCartInput,
  addManyToCartInput,
  removeFromCartInput,
  updateCartQuantityInput,
} from "./cart.schema";
import {
  addToCartService,
  addManyToCartService,
  removeFromCartService,
  getUserCartService,
  updateCartQuantityService,
} from "./cart.service";

function requireUser(ctx: unknown): string {
  const id = (ctx as { session?: { user?: { id?: string } } })?.session?.user?.id;
  if (!id) throw new TRPCError({ code: "UNAUTHORIZED" });
  return id;
}

export const cartRouter = router({
  add: protectedProcedure
    .input(addToCartInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return addToCartService(
        userId,
        input.eventSessionId,
        input.seatId,
        input.ticketCategoryId,
        input.quantity
      );
    }),

  addMany: protectedProcedure
    .input(addManyToCartInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return addManyToCartService(
        userId,
        input.eventId,
        input.eventSessionId,
        input.items
      );
    }),

  updateQuantity: protectedProcedure
    .input(updateCartQuantityInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return updateCartQuantityService(userId, input.cartItemId, input.quantity);
    }),

  remove: protectedProcedure
    .input(removeFromCartInput)
    .mutation(async ({ input, ctx }) => {
      const userId = requireUser(ctx);
      return removeFromCartService(userId, input.cartItemId);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = requireUser(ctx);
    return getUserCartService(userId);
  }),

});
