// src/modules/order/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  items: z.array(
    z.object({
      ticketCategoryId: z.string().cuid("Invalid ticket category ID"),
      categoryId: z.string().cuid("Invalid category ID"),
      quantity: z.number().min(1, "Must select at least 1 ticket"),
    })
  ).min(1, "Must include at least one item"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
