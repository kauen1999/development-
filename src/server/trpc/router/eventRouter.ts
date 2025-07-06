import { z } from "zod";
import {
  createEventService,
  getAllEventsService,
  getEventByIdService,
  enrollUserInEventService,
  updateEventService,
  cancelEventService,
  publishEventService,
} from "@/server/services/event.service";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { TRPCError } from "@trpc/server";

/**
 * 🔒 Utility: Require organizer role
 */
function requireOrganizer(role: string) {
  if (role !== "ORGANIZER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organizers can perform this action.",
    });
  }
}

/**
 * 📅 Common date validator
 */
const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid date format.",
});

/**
 * 🎟 Ticket category schema
 */
const ticketCategorySchema = z.object({
  title: z.string().min(1, "Category title is required."),
  price: z.number().positive("Price must be positive."),
  stock: z.number().int().positive("Stock must be a positive integer."),
});

/**
 * 📦 Base event schema (shared)
 */
const baseEventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  city: z.string().min(2, "City is required."),
  theater: z.string().min(2, "Theater is required."),
  price: z.number().positive("Price must be positive."),
  date: dateSchema,
  saleStart: dateSchema,
  saleEnd: dateSchema,
  capacity: z.number().int().positive("Capacity must be a positive integer."),
  ticketCategories: z.array(ticketCategorySchema).min(1, "At least one ticket category is required."),
});

/**
 * 🧾 createEvent schema with custom date validation
 */
const createEventSchema = baseEventSchema
  .refine((data) => new Date(data.saleStart) < new Date(data.saleEnd), {
    message: "Sale start must be before sale end.",
    path: ["saleStart"],
  })
  .refine((data) => new Date(data.saleEnd) <= new Date(data.date), {
    message: "Sale end must be on or before the event date.",
    path: ["saleEnd"],
  });

/**
 * ✏️ updateEvent schema
 */
const updateEventSchema = baseEventSchema.extend({
  eventId: z.string().cuid("Invalid event ID."),
});

/**
 * 🚦 Event Router
 */
export const eventRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      requireOrganizer(ctx.session.user.role);
      return createEventService(input, ctx.session.user.id);
    }),

  updateEvent: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      requireOrganizer(ctx.session.user.role);
      return updateEventService(input, ctx.session.user.id);
    }),

  cancelEvent: protectedProcedure
    .input(z.object({ eventId: z.string().cuid("Invalid event ID.") }))
    .mutation(async ({ ctx, input }) => {
      requireOrganizer(ctx.session.user.role);
      return cancelEventService(input.eventId, ctx.session.user.id);
    }),

  publishEvent: protectedProcedure
    .input(z.object({ eventId: z.string().cuid("Invalid event ID.") }))
    .mutation(async ({ ctx, input }) => {
      requireOrganizer(ctx.session.user.role);
      return publishEventService(input.eventId, ctx.session.user.id);
    }),

  getAllEvents: publicProcedure.query(() => {
    return getAllEventsService();
  }),

  getEventById: publicProcedure
    .input(z.string().cuid("Invalid event ID."))
    .query(async ({ input }) => {
      return getEventByIdService(input);
    }),

  enrollInEvent: protectedProcedure
    .input(z.object({ eventId: z.string().cuid("Invalid event ID.") }))
    .mutation(async ({ ctx, input }) => {
      return enrollUserInEventService(ctx.session.user.id, input.eventId);
    }),
});
