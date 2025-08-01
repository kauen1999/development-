// src/modules/event/event.schema.ts
import { z } from "zod";

// Auto seat generation structure
const generateSeatsSchema = z.object({
  rows: z.array(z.string().min(1, "Informe as letras das fileiras")).min(1, "Mínimo 1 fileira"),
  seatsPerRow: z.number().int().min(1, "Mínimo 1 assento por fileira"),
});

// Ticket category schema (usado fora do formulário)
export const ticketCategorySchema = z.object({
  title: z.string().min(1, "Nome da categoria é obrigatório"),
  price: z.number().min(0, "Preço deve ser zero ou maior"),
  stock: z.number().int().min(1, "Estoque mínimo é 1"),
  generateSeats: generateSeatsSchema.optional(),
});

// Conversor de string para Date
const dateStringToDate = z.preprocess(
  (val) => {
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? undefined : d;
  },
  z.date({ required_error: "Data inválida ou ausente", invalid_type_error: "Data inválida" })
);

// ✅ Schema usado apenas no formulário
export const createEventFormSchema = z.object({
  name: z.string().min(1, "Nome do evento é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  date: dateStringToDate,
  saleStart: dateStringToDate,
  saleEnd: dateStringToDate,
  city: z.string().min(1, "Cidade é obrigatória"),
  theater: z.string().min(1, "Teatro é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório"),
  price: z.number().min(0, "Preço base inválido"),
  capacity: z.number().int().min(1, "Capacidade mínima é 1"),
});

// ✅ Schema completo para validação antes da mutation (opcionalmente usado no backend)
export const createEventSchema = createEventFormSchema.extend({
  userId: z.string().cuid(),
  categoryIds: z.array(z.string().cuid()).min(1, "Categoria obrigatória"),
  ticketCategories: z.array(ticketCategorySchema).min(1, "Adicione pelo menos uma categoria de ingresso"),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  publishedAt: z.date().optional(),
});

// Update event schema
export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().cuid(),
});

// Get event by ID schema
export const getEventByIdSchema = z.object({
  id: z.string().cuid(),
});
