import { z } from "zod";
import { EventStatus, EventType } from "@prisma/client";

const generateSeatsSchema = z.object({
  rows: z.array(z.string().min(1)).min(1),
  seatsPerRow: z.number().int().min(1),
});

export const ticketCategorySchema = z.object({
  title: z.string().min(1),
  price: z.number().min(0),
  capacity: z.number().int().min(0),
  generateSeats: generateSeatsSchema.optional(),
});

export const eventSessionSchema = z.object({
  date: z.preprocess((val) => new Date(val as string), z.date()),
  venueName: z.string().min(1),
  city: z.string().min(1),
});

export const createEventFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  image: z.string().url("Invalid URL").optional(),

  street: z.string().min(1),
  number: z.string().min(1),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  venueName: z.string().min(1),

  slug: z.string().min(1),
  categoryId: z.string().cuid(),

  eventType: z.nativeEnum(EventType),

  ticketCategories: z.array(ticketCategorySchema).min(1),
  capacity: z.number().int().min(1).max(100000),
  eventSessions: z.array(eventSessionSchema).min(1),

  artists: z.array(z.string().min(1)).optional(),
});

const assertCategoryCapacityLTEEvent = (total: number, capacity: number) =>
  total <= capacity;

const sumCapacities = (arr: Array<z.infer<typeof ticketCategorySchema>>) =>
  arr.reduce((acc: number, cat) => acc + cat.capacity, 0);

const createEventSchemaBase = createEventFormSchema.extend({
  userId: z.string().cuid(),
  status: z.nativeEnum(EventStatus).optional(),
  publishedAt: z.date().optional(),
});

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

export const updateEventSchema = createEventSchemaBase
  .partial()
  .extend({
    id: z.string().cuid(),
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

export const getEventByIdSchema = z.object({
  id: z.string().cuid(),
});

export type CreateEventFormInput = z.infer<typeof createEventFormSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GetEventByIdInput = z.infer<typeof getEventByIdSchema>;
