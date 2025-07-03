import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  createInvoiceSchema,
  getInvoiceByOrderIdSchema,
} from "../../schema/invoice.schema";
import {
  createInvoiceService,
  getInvoiceByOrderIdService,
} from "../../services/invoice.service";

export const invoiceRouter = createTRPCRouter({
  createInvoice: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(({ input }) => {
      return createInvoiceService(input.orderId, input.cuitOrDni);
    }),

  getInvoiceByOrder: protectedProcedure
    .input(getInvoiceByOrderIdSchema)
    .query(({ input }) => {
      return getInvoiceByOrderIdService(input.orderId);
    }),
});
