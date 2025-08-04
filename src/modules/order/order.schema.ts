// src/modules/order/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  sessionId: z.string().cuid("Invalid session ID"),
  selectedLabels: z.array(z.string().min(2)).min(1).max(5),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
