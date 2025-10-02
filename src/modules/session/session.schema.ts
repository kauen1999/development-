// src/modules/session/session.schema.ts
import { z } from "zod";
import { SessionTicketingType, SessionStatus } from "@prisma/client";

export const ticketCategorySchema = z.object({
  title: z.string().min(1),
  price: z.number().positive().min(1), // preço mínimo 1 ARS
  capacity: z.number().int().nonnegative().default(0),
  currency: z.literal("ARS").optional(),
});

export const createSessionSchema = z.object({
  eventId: z.string().cuid(),
  dateTimeStart: z.date(),
  durationMin: z.number().int().positive(),
  timezone: z.string().optional(),

  venueName: z.string().min(1),
  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().min(1).optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),

  ticketingType: z.nativeEnum(SessionTicketingType),
  ticketCategories: z.array(ticketCategorySchema).min(1), // sempre por sessão

  // 👇 novos campos opcionais para artistas
  artists: z.array(z.string().min(1)).optional(),
  artistBanners: z.record(z.string()).optional(),
  createdByUserId: z.string().optional(),
});

export const updateSessionSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(SessionStatus).optional(),
  dateTimeStart: z.date().optional(),
  durationMin: z.number().int().positive().optional(),
  timezone: z.string().optional(),

  venueName: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  neighborhood: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  country: z.string().min(1).optional(),

  ticketingType: z.nativeEnum(SessionTicketingType).optional(),

  // 👇 idem aqui para edição
  artists: z.array(z.string().min(1)).optional(),
  artistBanners: z.record(z.string()).optional(),
  createdByUserId: z.string().optional(),
});

// SeatMap: Sector → Row → Seats-per-row
export const seatMapRowSchema = z.object({
  name: z.string().min(1), // ex: "A"
  seats: z.number().int().positive(), // qtd de assentos na fileira
});
export const seatMapSectorSchema = z.object({
  name: z.string().min(1), // ex: "West Central"
  order: z.number().int().min(0).default(0),
  ticketCategoryTitle: z.string().min(1).optional(), // resolve para a categoria
  rows: z.array(seatMapRowSchema).min(1),
});
export const upsertSeatMapSchema = z.object({
  sessionId: z.string().cuid(),
  sectors: z.array(seatMapSectorSchema).min(1),
});

export const attachArtistsSchema = z.object({
  sessionId: z.string().cuid(),
  artists: z.array(z.string().min(1)),
});

export const listByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
