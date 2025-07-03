import { z } from "zod";

export const createTicketSchema = z.object({
  orderItemId: z.string().cuid(),
  qrCodeUrl: z.string().url(),
  pdfUrl: z.string().url().optional(),
  walletPassUrl: z.string().url().optional(),
});

export const getTicketsByOrderItemSchema = z.object({
  orderItemId: z.string().cuid(),
});

export const markTicketAsUsedSchema = z.object({
  ticketId: z.string().cuid(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type GetTicketsByOrderItemInput = z.infer<typeof getTicketsByOrderItemSchema>;
export type MarkTicketAsUsedInput = z.infer<typeof markTicketAsUsedSchema>;
