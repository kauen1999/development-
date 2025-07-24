import { createTRPCRouter, protectedProcedure } from "../../server/trpc/trpc";
import {
  createInvoiceSchema,
  getInvoiceByOrderIdSchema,
} from "./invoice.schema";
import {
  createInvoiceService,
  getInvoiceByOrderIdService,
} from "@/modules/invoice/invoice.service";

export const invoiceRouter = createTRPCRouter({
  /**
   * Create a new invoice (requires orderId and optional cuitOrDni)
   */
  createInvoice: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(({ input }) => {
      return createInvoiceService(input.orderId, input.cuitOrDni);
    }),

  /**
   * Retrieve invoice details by orderId
   */
  getInvoiceByOrderId: protectedProcedure
    .input(getInvoiceByOrderIdSchema)
    .query(({ input }) => {
      return getInvoiceByOrderIdService(input.orderId);
    }),
});
