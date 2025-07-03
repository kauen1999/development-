import { z } from "zod";

export const createTicketSchema = z.object({
  orderItemId: z.string().cuid(),
  qrCodeUrl: z.string().url(),
  pdfUrl: z.string().url().optional(),
  walletPassUrl: z.string().url().optional(),
}).refine((data) => data.pdfUrl || data.walletPassUrl, {
  message: "Pelo menos um formato (PDF ou Wallet Pass) deve ser fornecido.",
  path: ["pdfUrl", "walletPassUrl"],
});

export const getTicketsByOrderItemSchema = z.object({
  orderItemId: z.string().cuid(),
});

export const markTicketAsUsedSchema = z.object({
  ticketId: z.string().cuid(),
});

export const validateTicketSchema = z.object({
  qrCodeId: z.string().min(8, "QR Code inválido"),
});

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type GetTicketsByOrderItemInput = z.infer<typeof getTicketsByOrderItemSchema>;
export type MarkTicketAsUsedInput = z.infer<typeof markTicketAsUsedSchema>;
