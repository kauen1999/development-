// src/modules/order/order.schema.ts
import { z } from "zod";

export const getOrderInput = z.object({
  id: z.string().cuid(),
});

export const listOrdersInput = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const cancelOrderInput = z.object({
  id: z.string().cuid(),
});

// GENERAL (por categoria)
export const createOrderGeneralInput = z.object({
  eventId: z.string().cuid(),
  eventSessionId: z.string().cuid(),
  items: z.array(
    z.object({
      ticketCategoryId: z.string().cuid(),
      quantity: z.number().int().min(1),
    })
  ).min(1),
});

// SEATED (por assento)
export const createOrderSeatedInput = z.object({
  eventId: z.string().cuid(),
  eventSessionId: z.string().cuid(),
  seatIds: z.array(z.string().cuid()).min(1),
});
