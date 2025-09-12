// src/modules/ticket/ticket.schema.ts
import { z } from "zod";

// create ticket manually (not used in automatic flow)
export const createTicketSchema = z.object({
  orderItemId: z.string().cuid("Invalid orderItemId"),
  qrCodeUrl: z.string().url("Invalid QR code URL"),
  pdfUrl: z.string().url("Invalid PDF URL").optional(),
});

// get tickets by orderItem
export const getTicketsByOrderItemSchema = z.object({
  orderItemId: z.string().cuid("Invalid orderItemId"),
});

export const markTicketAsUsedSchema = z.object({
  ticketId: z.string().cuid("Invalid ticket ID"),
});

// validate ticket by QR
export const validateTicketSchema = z.object({
  qrCode: z.string().min(8, "QR Code must be at least 8 characters"),
  device: z.string().optional(),
});

// Types
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type GetTicketsByOrderItemInput = z.infer<typeof getTicketsByOrderItemSchema>;
export type MarkTicketAsUsedInput = z.infer<typeof markTicketAsUsedSchema>;
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
