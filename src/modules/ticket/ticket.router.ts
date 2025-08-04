// src/modules/ticket/ticket.router.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";

import {
  getTicketsByOrderItemSchema,
  markTicketAsUsedSchema,
} from "./ticket.schema";

import {
  generateAndSaveTicket,
  getTicketsByOrderItemService,
  markTicketAsUsedService,
  validateTicketByQrService,
  generateTicketsFromOrder,
} from "./ticket.service";

export const ticketRouter = createTRPCRouter({
  // Gera todos os tickets de um pedido
  generateFromOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string().cuid("Invalid order ID"),
      })
    )
    .mutation(({ input }) => generateTicketsFromOrder(input.orderId)),

  //  Gera manualmente um ticket único para um item de pedido
  generateOne: protectedProcedure
    .input(
      z.object({
        orderItemId: z.string().cuid("Invalid orderItemId"),
      })
    )
    .mutation(({ input }) =>
      generateAndSaveTicket(input.orderItemId)
    ),

  // Lista os tickets de um item de pedido
  getByOrderItem: protectedProcedure
    .input(getTicketsByOrderItemSchema)
    .query(({ input }) =>
      getTicketsByOrderItemService(input.orderItemId)
    ),

  //  Marca um ticket como utilizado
  markAsUsed: protectedProcedure
    .input(markTicketAsUsedSchema)
    .mutation(({ input }) =>
      markTicketAsUsedService(input.ticketId)
    ),

  // Valida um ingresso via QR code
  validateByQrId: publicProcedure
    .input(
      z.object({
        qrCodeId: z.string().min(8, "QR Code ID is too short"),
      })
    )
    .mutation(({ input }) =>
      validateTicketByQrService(input.qrCodeId)
    ),
});
