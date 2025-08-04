// src/server/trpc/routers/event.schema.ts
import { z } from "zod";
import { EventStatus } from "@prisma/client";

// Assentos gerados automaticamente (não usado na criação de evento, mas útil em UI)
const generateSeatsSchema = z.object({
  rows: z.array(z.string().min(1)).min(1),
  seatsPerRow: z.number().min(1),
});

// Tipos fixos de ingresso
export const ticketCategorySchema = z.object({
  title: z.string().min(1),
  price: z.number().min(0),
  generateSeats: generateSeatsSchema.optional(),
});

// Sessão do evento
export const sessionSchema = z.object({
  date: z.preprocess((val) => new Date(val as string), z.date()),
  venueName: z.string().min(1),
  city: z.string().min(1),
});

// Schema para criação de evento (sem userId e status)
export const createEventFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  image: z.string().url("URL inválida").optional(),

  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  venueName: z.string().min(1),

  slug: z.string().min(1),
  categoryId: z.string().cuid(),
  ticketCategories: z.array(ticketCategorySchema).min(1),
  capacity: z.number().int().min(1).max(150),

  sessions: z.array(sessionSchema).min(1),
});

// Schema completo para API (inclui userId, status, publishedAt)
export const createEventSchema = createEventFormSchema.extend({
  userId: z.string().cuid(),
  status: z.nativeEnum(EventStatus).optional(),
  publishedAt: z.date().optional(),
});

// Para atualizações parciais
export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().cuid(),
});

// Para buscar evento por ID
export const getEventByIdSchema = z.object({
  id: z.string().cuid(),
});

// Tipagem auxiliar
export type CreateEventFormInput = z.infer<typeof createEventFormSchema>;
