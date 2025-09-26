// src/server/trpc/router/_app.ts

import { pagoticRouter } from "@/modules/pagotic/pagotic.router";
import { router } from "../trpc";
import { authRouter } from "@/modules/auth/trpcRouter";
import { eventRouter } from "@/modules/event/event.router";
import { orderRouter } from "@/modules/order/order.router";
import { categoryRouter } from "@/modules/category/event-category.router";
import { sessionRouter } from "@/modules/session/session.router";
import { artistRouter } from "@/modules/artist/artist.router";
import { searchRouter } from "@/modules/search/search.router";
import { cartRouter } from "@/modules/cart/cart.router";
import { ticketRouter } from "@/modules/ticket/ticket.router";

export const appRouter = router({
  auth: authRouter,
  pagotic: pagoticRouter,
  event: eventRouter,
  session: sessionRouter,
  artist: artistRouter,
  order: orderRouter,
  category: categoryRouter,
  eventCategory: categoryRouter,
  search: searchRouter,
  cart: cartRouter,
  ticket: ticketRouter,
});
export type AppRouter = typeof appRouter;
