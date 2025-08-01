// src/modules/event/event.router.ts
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  createEventSchema,
  getEventByIdSchema,
  updateEventSchema,
} from "./event.schema";
import {
  createEvent,
  updateEvent,
  cancelEvent,
  getEventById,
  listEvents,
  listTodayEvents,
} from "./event.service";
import { prisma } from "@/lib/prisma";

export const eventRouter = router({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return createEvent(input);
    }),

  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return updateEvent(input);
    }),

  cancel: protectedProcedure
    .input(getEventByIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return cancelEvent(input.id);
    }),

  publish: protectedProcedure
    .input(getEventByIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const event = await prisma.event.findUnique({
        where: { id: input.id },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (event.status === "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event is already published",
        });
      }

      return prisma.event.update({
        where: { id: input.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }),

  getById: publicProcedure
    .input(getEventByIdSchema)
    .query(async ({ input }) => {
      return getEventById(input);
    }),

  list: publicProcedure.query(() => listEvents()),

  today: publicProcedure.query(() => listTodayEvents()),
});
