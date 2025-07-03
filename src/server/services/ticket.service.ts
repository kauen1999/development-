import { prisma } from "../db/client";
import {
  type CreateTicketInput,
  type GetTicketsByOrderItemInput,
  type MarkTicketAsUsedInput,
} from "../schema/ticket.schema";

/**
 * Cria um novo ingresso associado a um item de pedido
 */
export const createTicketService = async (input: CreateTicketInput) => {
  return prisma.ticket.create({
    data: {
      orderItemId: input.orderItemId,
      qrCodeUrl: input.qrCodeUrl,
      pdfUrl: input.pdfUrl,
      walletPassUrl: input.walletPassUrl,
    },
  });
};

/**
 * Retorna todos os ingressos vinculados a um item de pedido
 */
export const getTicketsByOrderItemService = async (
  input: GetTicketsByOrderItemInput
) => {
  return prisma.ticket.findMany({
    where: { orderItemId: input.orderItemId },
  });
};

/**
 * Marca um ingresso como utilizado (opcional: para validação via QR)
 */
export const markTicketAsUsedService = async (
  input: MarkTicketAsUsedInput
) => {
  return prisma.ticket.update({
    where: { id: input.ticketId },
    data: { usedAt: new Date() },
  });
};
