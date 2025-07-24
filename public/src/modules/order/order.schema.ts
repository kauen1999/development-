import { z } from "zod";

/**
 * Schema para criação de pedido (Order)
 */
export const createOrderSchema = z.object({
  eventId: z
    .string()
    .cuid({ message: "ID do evento inválido (esperado formato CUID)" }),

  items: z
    .array(
      z.object({
        categoryId: z
          .string()
          .cuid({ message: "ID da categoria inválido (CUID esperado)" }),

        ticketCategoryId: z
          .string()
          .cuid({ message: "ID da categoria do ingresso inválido (CUID esperado)" }),

        quantity: z
          .number()
          .int({ message: "Quantidade deve ser um número inteiro" })
          .min(1, { message: "Quantidade mínima por item é 1" })
          .max(10, { message: "Quantidade máxima por item é 10" }),
      })
    )
    .min(1, { message: "Deve haver pelo menos um item no pedido." }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Schema para obter um pedido específico por ID
 */
export const getOrderSchema = z.object({
  id: z
    .string()
    .cuid({ message: "ID do pedido inválido (esperado formato CUID)" }),
});

export type GetOrderInput = z.infer<typeof getOrderSchema>;

/**
 * Schema para paginação/listagem de pedidos
 */
export const listOrdersSchema = z.object({
  skip: z
    .number()
    .int({ message: "Skip deve ser um número inteiro" })
    .min(0, { message: "Skip não pode ser negativo" })
    .optional(),

  take: z
    .number()
    .int({ message: "Take deve ser um número inteiro" })
    .min(1, { message: "Valor mínimo de take é 1" })
    .optional(),
});

export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
