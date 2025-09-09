import { z } from "zod";

export const createCategorySchema = z.object({
  sessionId: z.string().cuid(),
  title: z.string().min(1),
  price: z.number().positive().min(51), // mínimo provedor
  capacity: z.number().int().nonnegative().default(0),
  currency: z.literal("ARS").optional(),
});

export const updateCategorySchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).optional(),
  price: z.number().positive().min(51).optional(),
  capacity: z.number().int().nonnegative().optional(),
  currency: z.literal("ARS").optional(),
});

export const getByIdSchema = z.object({ id: z.string().cuid() });
export const listBySessionSchema = z.object({ sessionId: z.string().cuid() });
export const deleteCategorySchema = z.object({ id: z.string().cuid() });
