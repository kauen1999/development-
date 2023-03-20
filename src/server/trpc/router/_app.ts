import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { notificationRouter } from "./notification";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
