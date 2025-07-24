import { createTRPCRouter } from "../trpc";
import { authRouter } from "../../../modules/auth/auth.router";
import { notificationRouter } from "../../../modules/notification/notificationRouter";
import { eventRouter } from "../../../modules/event/eventRouter";
import { categoryRouter } from "../../../modules/eventCategory/categoryRouter";
import { orderRouter } from "../../../modules/order/orderRouter";
import { ticketRouter } from "../../../modules/ticket/ticket.router";
import { paymentRouter } from "../../../modules/payment/paymentRouter";
import { invoiceRouter } from "../../../modules/invoice/invoiceRouter";

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
