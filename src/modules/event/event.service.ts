// src/server/trpc/routers/event.service.ts
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  createEventSchema,
  updateEventSchema,
  getEventByIdSchema,
} from "./event.schema";
import { EventStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Criação de evento
export const createEvent = async (input: z.infer<typeof createEventSchema>) => {
  const existing = await prisma.event.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Slug já existe." });
  }

  return prisma.event.create({
    data: {
      name: input.name,
      description: input.description,
      image: input.image,
      street: input.street,
      number: input.number,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      venueName: input.venueName,
      slug: input.slug,
      status: input.status ?? EventStatus.OPEN,
      publishedAt: input.publishedAt ?? new Date(),
      capacity: input.capacity,
      category: { connect: { id: input.categoryId } },
      organizer: { connect: { id: input.userId } },
      ticketCategories: {
        create: input.ticketCategories.map((cat) => ({
          title: cat.title,
          price: cat.price,
        })),
      },
      sessions: {
        create: input.sessions.map((s) => ({
          date: s.date,
          city: s.city,
          venueName: s.venueName,
        })),
      },
      artists: input.artists?.length
        ? {
            create: input.artists.map((name) => ({
              name,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      ticketCategories: true,
      sessions: true,
      organizer: true,
      artists: true, // incluir os artistas na resposta
    },
  });
};

// Atualização de evento
export const updateEvent = async (input: z.infer<typeof updateEventSchema>) => {
  const { id, userId, categoryId, ticketCategories, sessions, artists, ...fields } = input;

  return prisma.event.update({
    where: { id },
    data: {
      ...fields,
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(userId && { organizer: { connect: { id: userId } } }),
      ...(ticketCategories && {
        ticketCategories: {
          deleteMany: {},
          create: ticketCategories.map((cat) => ({
            title: cat.title,
            price: cat.price,
          })),
        },
      }),
      ...(sessions && {
        sessions: {
          deleteMany: {},
          create: sessions.map((s) => ({
            date: s.date,
            venueName: s.venueName,
            city: s.city,
          })),
        },
      }),
      ...(artists && {
        artists: {
          deleteMany: {},
          create: artists.map((name) => ({ name })),
        },
      }),
    },
    include: {
      category: true,
      ticketCategories: true,
      sessions: true,
      organizer: true,
      artists: true,
    },
  });
};


// Cancelar evento
export const cancelEvent = async (eventId: string) => {
  return prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.FINISHED },
  });
};

// Finalizar evento
export const finishEvent = async (eventId: string) => {
  return prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.FINISHED },
  });
};

// Buscar evento por ID
export const getEventById = async (input: z.infer<typeof getEventByIdSchema>) => {
  return prisma.event.findUnique({
    where: { id: input.id },
    include: {
      category: true,
      ticketCategories: { include: { seats: true } },
      sessions: true,
      organizer: true,
    },
  });
};

// Listar eventos abertos
export const listEvents = async () => {
  return prisma.event.findMany({
    where: { status: EventStatus.OPEN },
    orderBy: { createdAt: "asc" },
    include: {
      category: true,
      ticketCategories: true,
      sessions: true,
      organizer: true,
    },
  });
};

// Listar eventos por data (usando session.date)
export const listEventsByDate = async (dateString: string) => {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(`${dateString}T23:59:59`);

  const sessions = await prisma.session.findMany({
    where: {
      date: { gte: start, lte: end },
      event: { status: EventStatus.OPEN },
    },
    include: {
      event: {
        include: {
          category: true,
          ticketCategories: true,
          sessions: true,
          organizer: true,
        },
      },
    },
  });

  const unique = new Map<string, typeof sessions[0]["event"]>();
  for (const s of sessions) {
    if (s.event && !unique.has(s.event.id)) {
      unique.set(s.event.id, s.event);
    }
  }

  return Array.from(unique.values());
};
