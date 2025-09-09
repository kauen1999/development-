// src/modules/event/event.schema.ts
import { z } from "zod";
import { EventStatus, SessionTicketingType } from "@prisma/client";

/* =========================
 * CREATE / UPDATE BÁSICO
 * ========================= */
export const createEventSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  image: z.string().url().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  categoryId: z.string().cuid("Categoría inválida"),
  userId: z.string().cuid("Usuario inválido"), // organizer
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  id: z.string().cuid(),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  publishedAt: z.date().optional(),
  categoryId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const idSchema = z.object({ id: z.string().cuid() });
export type IdInput = z.infer<typeof idSchema>;

/* =========================
 * UPDATE COM SESSÕES (GRAFO)
 * ========================= */

// General (sem assentos)
const generalCategorySchema = z.object({
  title: z.string().min(1),
  price: z.number().nonnegative(),
  capacity: z.number().int().nonnegative(),
});

// Seated (com assentos) — definimos setores e filas
const seatedRowSchema = z.object({
  name: z.string().min(1),
  seatCount: z.number().int().nonnegative(), // quantidade de assentos na fila
});

const seatedSectorSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  rows: z.array(seatedRowSchema).min(1, "El sector debe tener al menos una fila"),
});

const baseSessionUpdateSchema = z.object({
  id: z.string().cuid().optional(), // se ausente -> cria nova sessão
  dateTimeStart: z.date(),
  durationMin: z.number().int().positive(),
  timezone: z.string().min(1),
  venueName: z.string().min(1),
  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().length(2), // ISO-2
  artists: z.array(z.string().min(1)).default([]), // nomes dos artistas
});

const sessionUpdateSchema = z.discriminatedUnion("ticketingType", [
  z
    .object({
      ticketingType: z.literal(SessionTicketingType.GENERAL),
      categories: z.array(generalCategorySchema).min(1),
    })
    .merge(baseSessionUpdateSchema),
  z
    .object({
      ticketingType: z.literal(SessionTicketingType.SEATED),
      sectors: z.array(seatedSectorSchema).min(1),
    })
    .merge(baseSessionUpdateSchema),
]);

export const updateEventWithGraphSchema = z.object({
  // Evento base
  id: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  image: z.string().url().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  categoryId: z.string().cuid(),

  // Para criar artistas locais, caso não existam por nome
  createdByUserId: z.string().cuid().optional(),

  // Sessões (full replace por sessão)
  sessions: z.array(sessionUpdateSchema).min(1, "Debe enviar al menos una sesión"),
});

export type UpdateEventWithGraphInput = z.infer<typeof updateEventWithGraphSchema>;
