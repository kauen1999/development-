// src/server/trpc/router/_app.ts

import { pagoticRouter } from "@/modules/pagotic/pagotic.router";
import { router } from "../trpc";
import { authRouter } from "@/modules/auth/trpcRouter";
import { eventRouter } from "@/modules/event/event.router";
import { orderRouter } from "@/modules/order/orderRouter";

export const appRouter = router({
  auth: authRouter,
  pagotic: pagoticRouter,
  event: eventRouter,
  order: orderRouter,
});
export type AppRouter = typeof appRouter;
