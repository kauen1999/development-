import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  city: z.string(),
  theater: z.string(),
  price: z.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  saleStart: z.string().optional(),
  saleEnd: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
