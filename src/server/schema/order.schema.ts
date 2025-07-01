// src/schema/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  eventId: z.string().cuid(),
  items: z.array(
    z.object({
      categoryId: z.string().cuid(),
      ticketCategoryId: z.string().cuid(),
      quantity: z.number().min(1),
    })
  ),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;


export const getOrderSchema = z.object({
  id: z.string().cuid({ message: "Invalid order ID" }),
});
export type GetOrderInput = z.infer<typeof getOrderSchema>;

export const listOrdersSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).optional(),
});
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
