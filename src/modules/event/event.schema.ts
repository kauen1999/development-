// src/modules/event/event.schema.ts
import { z } from "zod";
import { EventStatus, EventType } from "@prisma/client";

// Automatically generated seats (optional, only for SEATED events)
const generateSeatsSchema = z.object({
  rows: z.array(z.string().min(1)).min(1),
  seatsPerRow: z.number().int().min(1),
});

// Ticket category schema
export const ticketCategorySchema = z.object({
  title: z.string().min(1),
  price: z.number().min(0),
  capacity: z.number().int().min(0),               // capacity per category
  generateSeats: generateSeatsSchema.optional(),   // only if eventType === SEATED
});

// Session schema
export const sessionSchema = z.object({
  date: z.preprocess((val) => new Date(val as string), z.date()),
  venueName: z.string().min(1),
  city: z.string().min(1),
});

// Base form schema for creating an event (no userId/status)
export const createEventFormSchema = z.object({
  name:        z.string().min(1),
  description: z.string().min(1),
  image:       z.string().url("Invalid URL").optional(),

  street:       z.string().min(1),
  number:       z.string().min(1),
  neighborhood: z.string().min(1),
  city:         z.string().min(1),
  state:        z.string().min(1),
  zipCode:      z.string().min(1),
  venueName:    z.string().min(1),

  slug:       z.string().min(1),
  categoryId: z.string().cuid(),

  eventType: z.nativeEnum(EventType),               // SEATED or GENERAL

  ticketCategories: z.array(ticketCategorySchema).min(1),

  capacity: z.number().int().min(1).max(100000),    // global event capacity
  sessions: z.array(sessionSchema).min(1),

  artists: z.array(z.string().min(1)).optional(),
});

// ---------- Capacity rule helpers ----------
const assertCategoryCapacityLTEEvent = (
  total: number,
  capacity: number,
) => total <= capacity;

const sumCapacities = (arr: Array<z.infer<typeof ticketCategorySchema>>) =>
  arr.reduce((acc: number, cat) => acc + cat.capacity, 0);

// ---------- Build API schemas ----------

// Keep an OBJECT base to allow .partial() later without ZodEffects issues
const createEventSchemaBase = createEventFormSchema.extend({
  userId:      z.string().cuid(),
  status:      z.nativeEnum(EventStatus).optional(),
  publishedAt: z.date().optional(),
});

// Apply capacity rule to CREATE
export const createEventSchema = createEventSchemaBase.superRefine((data, ctx) => {
  const total = sumCapacities(data.ticketCategories);
  if (!assertCategoryCapacityLTEEvent(total, data.capacity)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ticketCategories"],
      message:
        "A soma das capacidades das categorias não pode ultrapassar a capacidade total do evento",
    });
  }
});

// UPDATE: start from the *object* base (not the Effects) to keep .partial() working
export const updateEventSchema = createEventSchemaBase
  .partial()
  .extend({
    id:        z.string().cuid(),
    eventType: z.nativeEnum(EventType).optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.capacity === "number" && Array.isArray(data.ticketCategories)) {
      const total = sumCapacities(
        data.ticketCategories as Array<z.infer<typeof ticketCategorySchema>>
      );
      if (!assertCategoryCapacityLTEEvent(total, data.capacity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticketCategories"],
          message:
            "A soma das capacidades das categorias não pode ultrapassar a capacidade total do evento",
        });
      }
    }
  });

// Schema to fetch an event by ID
export const getEventByIdSchema = z.object({
  id: z.string().cuid(),
});

// Type exports for convenience
export type CreateEventFormInput = z.infer<typeof createEventFormSchema>;
export type CreateEventInput     = z.infer<typeof createEventSchema>;
export type UpdateEventInput     = z.infer<typeof updateEventSchema>;
export type GetEventByIdInput    = z.infer<typeof getEventByIdSchema>;
