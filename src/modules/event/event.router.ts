import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createEventSchema,
  idSchema,
  updateEventSchema,
  updateEventWithGraphSchema,
} from "./event.schema";
import {
  cancelEvent,
  createEvent,
  getEventById,
  listEventsPublished,
  pauseEvent,
  publishEvent,
  updateEvent,
  updateEventWithGraph,
} from "./event.service";
import { prisma } from "@/lib/prisma";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "No autorizado" });
  }
  return next();
});

export const eventRouter = router({
  /* =========================
   * CRUD
   * ========================= */
  create: adminProcedure.input(createEventSchema).mutation(({ input }) =>
    createEvent(input)
  ),

  update: adminProcedure.input(updateEventSchema).mutation(({ input }) =>
    updateEvent(input)
  ),

  updateWithGraph: adminProcedure
    .input(updateEventWithGraphSchema)
    .mutation(({ input }) => updateEventWithGraph(input)), // ✅ só atualiza dados do evento

  /* =========================
   * STATUS
   * ========================= */
  publish: adminProcedure.input(idSchema).mutation(({ input }) =>
    publishEvent(input.id)
  ),

  pause: adminProcedure.input(idSchema).mutation(({ input }) =>
    pauseEvent(input.id)
  ),

  cancel: adminProcedure.input(idSchema).mutation(({ input }) =>
    cancelEvent(input.id)
  ),

  /* =========================
   * QUERIES PÚBLICAS
   * ========================= */
  getById: publicProcedure.input(idSchema).query(({ input }) =>
    getEventById(input.id)
  ),

  listPublished: publicProcedure.query(() => listEventsPublished()),

  list: publicProcedure.query(async () =>
    prisma.event.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: true,
        eventSessions: {
          include: {
            ticketCategories: true,
            artists: {
              include: {
                artist: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  listByDate: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return prisma.event.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { lte: new Date() },
          eventSessions: {
            some: {
              dateTimeStart: { gte: startOfDay, lte: endOfDay },
            },
          },
        },
        include: {
          category: true,
          eventSessions: {
            include: {
              ticketCategories: true,
              artists: {
                include: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /* =========================
   * QUERIES ADMIN
   * ========================= */
  getForEdit: adminProcedure.input(idSchema).query(({ input }) =>
    getEventById(input.id) // ✅ retorna eventSessions, categories, artistas, setores etc.
  ),

  listActiveEventsWithStats: protectedProcedure.query(async ({ ctx }) => {
    const events = await prisma.event.findMany({
      where: { organizerId: ctx.session.user.id },
      include: {
        eventSessions: {
          include: {
            ticketCategories: {
              include: {
                tickets: { select: { id: true, usedAt: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return events.map((ev) => {
      const totalCapacity = ev.eventSessions.reduce(
        (sum, s) =>
          sum +
          s.ticketCategories.reduce((acc, c) => acc + (c.capacity ?? 0), 0),
        0
      );

      const totalSold = ev.eventSessions.reduce(
        (sum, s) => sum + s.ticketCategories.reduce((acc, c) => acc + c.tickets.length, 0),
        0
      );

      const totalValidated = ev.eventSessions.reduce(
        (sum, s) =>
          sum +
          s.ticketCategories.reduce(
            (acc, c) => acc + c.tickets.filter((t) => t.usedAt !== null).length,
            0
          ),
        0
      );

      return {
        id: ev.id,
        name: ev.name,
        status: ev.status,
        totalCapacity,
        totalSold,
        totalValidated,
        categories: ev.eventSessions.flatMap((s) =>
          s.ticketCategories.map((c) => ({
            id: c.id,
            title: c.title,
            capacity: c.capacity,
            sold: c.tickets.length,
            validated: c.tickets.filter((t) => t.usedAt !== null).length,
            remaining: Math.max(0, (c.capacity ?? 0) - c.tickets.length),
          }))
        ),
      };
    });
  }),
});
