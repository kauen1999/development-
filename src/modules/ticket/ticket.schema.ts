// src/modules/ticket/ticket.schema.ts
import { z } from "zod";

// Criar ticket manual (não usado no fluxo automático)
export const createTicketSchema = z.object({
  orderItemId: z.string().cuid("Invalid orderItemId"),
  qrCodeUrl: z.string().url("Invalid QR code URL"),
  pdfUrl: z.string().url("Invalid PDF URL").optional(),
});

// Buscar tickets por OrderItem
export const getTicketsByOrderItemSchema = z.object({
  orderItemId: z.string().cuid("Invalid orderItemId"),
});

export const markTicketAsUsedSchema = z.object({
  ticketId: z.string().cuid("Invalid ticket ID"),
});

export const validateTicketSchema = z.object({
  qrCodeId: z.string().min(8, "QR Code must be at least 8 characters"),
});

// Types
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type GetTicketsByOrderItemInput = z.infer<typeof getTicketsByOrderItemSchema>;
export type MarkTicketAsUsedInput = z.infer<typeof markTicketAsUsedSchema>;
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
