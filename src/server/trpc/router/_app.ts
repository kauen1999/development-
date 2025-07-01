import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { notificationRouter } from "./notification";
import { eventRouter } from "./event";
import { categoryRouter } from "./category";
import { orderRouter } from "./order";
import { ticketRouter } from "./ticket.router";
import { paymentRouter } from "./paymentRouter";
import { invoiceRouter } from "./invoice";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  notification: notificationRouter,
  event: eventRouter, 
  category: categoryRouter,
  order: orderRouter, 
  ticket: ticketRouter,
  payment: paymentRouter,
  invoice: invoiceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
