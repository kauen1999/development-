import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  createTicketSchema,
  getTicketsByOrderItemSchema,
  markTicketAsUsedSchema,
} from "../../schema/ticket.schema";
import {
  createTicketService,
  getTicketsByOrderItemService,
  markTicketAsUsedService,
} from "../../services/ticket.service";

/**
 * Router para gerenciamento de ingressos
 */
export const ticketRouter = createTRPCRouter({
  // Criação de ingresso
  create: protectedProcedure
    .input(createTicketSchema)
    .mutation(async ({ input }) => {
      return createTicketService(input);
    }),

  // Buscar ingressos por item de pedido
  getByOrderItem: protectedProcedure
    .input(getTicketsByOrderItemSchema)
    .query(async ({ input }) => {
      return getTicketsByOrderItemService(input);
    }),

  // Marcar ingresso como utilizado
  markAsUsed: protectedProcedure
    .input(markTicketAsUsedSchema)
    .mutation(async ({ input }) => {
      return markTicketAsUsedService(input);
    }),
});
