import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";

import {
  getTicketsByOrderItemSchema,
  markTicketAsUsedSchema,
} from "@/server/schema/ticket.schema";

import {
  generateAndSaveTicket,
  getTicketsByOrderItemService,
  markTicketAsUsedService,
  validateTicketByQrService,
} from "@/server/services/ticket.service";

export const ticketRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        orderItemId: z.string().cuid(),
        orderId: z.string().cuid(),
        userName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { orderItemId, orderId, userName } = input;
      return generateAndSaveTicket(orderItemId, orderId, userName);
    }),

  getByOrderItem: protectedProcedure
    .input(getTicketsByOrderItemSchema)
    .query(async ({ input }) => {
      return getTicketsByOrderItemService(input.orderItemId);
    }),

  markAsUsed: protectedProcedure
    .input(markTicketAsUsedSchema)
    .mutation(async ({ input }) => {
      return markTicketAsUsedService(input.ticketId);
    }),

  validateByQrId: publicProcedure
    .input(z.object({ qrId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return validateTicketByQrService(input.qrId);
    }),
});
