// src/modules/order/order.schema.ts
import { z } from "zod";

// SEATED (assentos)
export const createOrderSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  eventSessionId: z.string().cuid("Invalid event session ID"),
  selectedLabels: z.array(z.string().min(2)).min(1).max(5),
});

// GENERAL (sem assentos) — até 5 ingressos no total
export const createOrderGeneralSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  eventSessionId: z.string().cuid("Invalid event session ID"),
  items: z
    .array(
      z.object({
        categoryId: z.string().cuid("Invalid category ID"),
        qty: z.number().int().min(1).max(5),
      })
    )
    .min(1)
    .superRefine((items, ctx) => {
      const total = items.reduce((s, i) => s + i.qty, 0);
      if (total < 1 || total > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes comprar entre 1 y 5 entradas.",
          path: ["items"],
        });
      }
    }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderGeneralInput = z.infer<typeof createOrderGeneralSchema>;
