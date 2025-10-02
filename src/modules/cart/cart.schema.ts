//src/modules/cart/cart.schema.ts
import { z } from "zod";

// Add item to cart
export const addToCartInput = z.object({
  eventSessionId: z.string().cuid(),
  seatId: z.string().cuid().optional(),
  ticketCategoryId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(5).default(1),
});

// Remove item from cart
export const removeFromCartInput = z.object({
  cartItemId: z.string().cuid(),
});

// List user cart
export const getCartInput = z.object({
  userId: z.string().cuid().optional(),
});

// Add many items to cart
export const addManyToCartInput = z.object({
  eventId: z.string().cuid(), // ✅ obrigatório agora
  eventSessionId: z.string().cuid(),
  items: z.array(
    z.object({
      seatId: z.string().cuid().optional(),
      ticketCategoryId: z.string().cuid().optional(),
      quantity: z.number().int().min(1).max(5).default(1),
    })
  ),
});

// Update quantity
export const updateCartQuantityInput = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.number().int().min(0).max(5),
});
