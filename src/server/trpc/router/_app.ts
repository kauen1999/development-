// src/server/trpc/router/_app.ts

import { router } from "../trpc";
import { authRouter } from "@/modules/auth/trpcRouter";

export const appRouter = router({
  auth: authRouter,
  // ... outros routers no futuro
});
export type AppRouter = typeof appRouter;
