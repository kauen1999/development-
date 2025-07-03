import { z } from "zod";

export const createInvoiceSchema = z.object({
  orderId: z.string().cuid(),
  cuitOrDni: z.string().min(7).max(20).optional(),
  pdfUrl: z.string().url().optional(),
});

export const getInvoiceByOrderIdSchema = z.object({
  orderId: z.string().cuid(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type GetInvoiceByOrderIdInput = z.infer<typeof getInvoiceByOrderIdSchema>;
