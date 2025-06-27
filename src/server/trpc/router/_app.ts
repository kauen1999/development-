import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { notificationRouter } from "./notification";
import { eventRouter } from "./event";
import { categoryRouter } from "./category";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  notification: notificationRouter,
  event: eventRouter, 
  category: categoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
