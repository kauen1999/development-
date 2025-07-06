import { createTRPCRouter } from "../trpc";
import { authRouter } from "./authRouter";
import { notificationRouter } from "./notificationRouter";
import { eventRouter } from "./eventRouter";
import { categoryRouter } from "./categoryRouter";
import { orderRouter } from "./orderRouter";
import { ticketRouter } from "./ticket.router";
import { paymentRouter } from "./paymentRouter";
import { invoiceRouter } from "./invoiceRouter";

export const appRouter = createTRPCRouter({
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
