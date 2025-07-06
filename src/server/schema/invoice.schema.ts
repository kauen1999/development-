import { z } from "zod";

export const createInvoiceSchema = z.object({
  orderId: z
    .string()
    .cuid({ message: "ID do pedido inválido (esperado formato CUID)" }),

  cuitOrDni: z
    .string()
    .regex(/^\d{7,11}$/, {
      message: "CUIT/DNI deve conter entre 7 e 11 dígitos numéricos",
    })
    .optional(),

  pdfUrl: z
    .string()
    .url({ message: "URL do PDF inválida" })
    .optional(),
});

export const getInvoiceByOrderIdSchema = z.object({
  orderId: z
    .string()
    .cuid({ message: "ID do pedido inválido (esperado formato CUID)" }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type GetInvoiceByOrderIdInput = z.infer<typeof getInvoiceByOrderIdSchema>;
