// src/modules/event/event.service.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { EventStatus, EventType } from "@prisma/client";
import type {
  CreateEventInput,
  UpdateEventInput,
  GetEventByIdInput,
} from "./event.schema";
import { TRPCError } from "@trpc/server";

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/** Usa a última letra do título (ex.: "Platea A" -> "A"), senão a primeira. */
function rowFromCategoryTitle(title: string) {
  const m = title.match(/([A-Za-z])\s*$/);
  return (m?.[1] ?? title.charAt(0) ?? "A").toUpperCase();
}

/** Gera N assentos rotulados ROW1..ROWN para uma sessão/categoria. */
function buildSeatsByCapacity(args: {
  eventId: string;
  sessionId: string;
  ticketCategoryId: string;
  row: string;
  capacity: number;
}): Prisma.SeatCreateManyInput[] {
  const out: Prisma.SeatCreateManyInput[] = [];
  for (let i = 1; i <= args.capacity; i++) {
    out.push({
      eventId: args.eventId,
      sessionId: args.sessionId,
      ticketCategoryId: args.ticketCategoryId,
      row: args.row,
      number: i,
      label: `${args.row}${i}`,
      status: "AVAILABLE",
      createdAt: new Date(),
      userId: null,
    });
  }
  return out;
}

// ─── CREATE EVENT ───────────────────────────────────────────────────────────────
export const createEvent = async (input: CreateEventInput) => {
  // 0) Slug único
  const existing = await prisma.event.findUnique({ where: { slug: input.slug } });
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug já existe." });

  // 1) Regra de capacidade (sempre)
  const totalCats = sum(input.ticketCategories.map((c) => c.capacity ?? 0));
  if (totalCats > input.capacity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Soma das capacidades das categorias (${totalCats}) excede a capacidade do evento (${input.capacity}).`,
    });
  }

  // 2) Transação: cria evento, categorias, sessões e (se SEATED) assentos por capacity
  const createdId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
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
        eventType: input.eventType,
        capacity: input.capacity,
        publishedAt: input.publishedAt ?? new Date(),

        category: { connect: { id: input.categoryId } },
        organizer: { connect: { id: input.userId } },

        ticketCategories: {
          create: input.ticketCategories.map((c) => ({
            title: c.title,
            price: c.price,
            capacity: c.capacity,
          })),
        },

        sessions: {
          create: input.sessions.map((s) => ({
            date: s.date,
            venueName: s.venueName,
            city: s.city,
          })),
        },
      },
      include: { ticketCategories: true, sessions: true },
    });

    // SEATED → gera assentos por capacity da categoria (por sessão)
    if (event.eventType === EventType.SEATED) {
      const seatData: Prisma.SeatCreateManyInput[] = [];
      for (const cat of event.ticketCategories) {
        const row = rowFromCategoryTitle(cat.title);
        for (const ses of event.sessions) {
          seatData.push(
            ...buildSeatsByCapacity({
              eventId: event.id,
              sessionId: ses.id,
              ticketCategoryId: cat.id,
              row,
              capacity: cat.capacity,
            })
          );
        }
      }
      if (seatData.length) await tx.seat.createMany({ data: seatData });
    }

    // Artistas (simples)
    if (input.artists?.length) {
      for (const nameStr of input.artists) {
        const artist = await tx.artist.create({ data: { name: nameStr } });
        await tx.eventArtist.create({
          data: { eventId: event.id, artistId: artist.id },
        });
      }
    }

    return event.id;
  });

  // 3) Retorna completo
  return prisma.event.findUniqueOrThrow({
    where: { id: createdId },
    include: {
      category: true,
      organizer: true,
      sessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });
};

// ─── UPDATE EVENT ───────────────────────────────────────────────────────────────
export const updateEvent = async (input: UpdateEventInput) => {
  // 0) Coleta estado atual para validar capacidade
  const current = await prisma.event.findUniqueOrThrow({
    where: { id: input.id },
    include: { ticketCategories: true },
  });

  const newCapacity = typeof input.capacity === "number" ? input.capacity : current.capacity;
  const catsForValidation =
    input.ticketCategories ?? current.ticketCategories.map((c) => ({
      title: c.title,
      price: c.price,
      capacity: c.capacity,
    }));

  const totalCats = sum(catsForValidation.map((c) => c.capacity ?? 0));
  if (totalCats > newCapacity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Soma das capacidades das categorias (${totalCats}) excede a capacidade do evento (${newCapacity}).`,
    });
  }

  // 1) Transação de atualização
  const updatedId = await prisma.$transaction(async (tx) => {
    // Atualiza campos básicos + (re)cria categorias/sessões quando enviados
    await tx.event.update({
      where: { id: input.id },
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
        status: input.status,
        eventType: input.eventType,
        capacity: input.capacity,
        publishedAt: input.publishedAt,
        ...(input.categoryId && { category: { connect: { id: input.categoryId } } }),
        ...(input.userId && { organizer: { connect: { id: input.userId } } }),
        ...(input.ticketCategories && {
          ticketCategories: {
            deleteMany: {},
            create: input.ticketCategories.map((c) => ({
              title: c.title,
              price: c.price,
              capacity: c.capacity,
            })),
          },
        }),
        ...(input.sessions && {
          sessions: {
            deleteMany: {},
            create: input.sessions.map((s) => ({
              date: s.date,
              venueName: s.venueName,
              city: s.city,
            })),
          },
        }),
      },
    });

    // 2) Regerar assentos conforme o tipo
    if (input.eventType === EventType.SEATED) {
      // limpa assentos atuais do evento
      await tx.seat.deleteMany({ where: { eventId: input.id } });

      // busca categorias e sessões (após update)
      const fresh = await tx.event.findUniqueOrThrow({
        where: { id: input.id },
        include: { sessions: true, ticketCategories: true },
      });

      const seatData: Prisma.SeatCreateManyInput[] = [];
      for (const cat of fresh.ticketCategories) {
        const row = rowFromCategoryTitle(cat.title);
        for (const ses of fresh.sessions) {
          seatData.push(
            ...buildSeatsByCapacity({
              eventId: fresh.id,
              sessionId: ses.id,
              ticketCategoryId: cat.id,
              row,
              capacity: cat.capacity,
            })
          );
        }
      }

      if (seatData.length) await tx.seat.createMany({ data: seatData });
    } else {
      // Se mudou para GENERAL, remove assentos existentes
      await tx.seat.deleteMany({ where: { eventId: input.id } });
    }

    // 3) Atualiza artistas se enviados
    if (input.artists) {
      await tx.eventArtist.deleteMany({ where: { eventId: input.id } });
      for (const nameStr of input.artists) {
        const artist = await tx.artist.create({ data: { name: nameStr } });
        await tx.eventArtist.create({
          data: { eventId: input.id, artistId: artist.id },
        });
      }
    }

    return input.id;
  });

  // 2) Retorna completo
  return prisma.event.findUniqueOrThrow({
    where: { id: updatedId },
    include: {
      category: true,
      organizer: true,
      sessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });
};

// ─── CANCEL / FINISH ────────────────────────────────────────────────────────────
export const cancelEvent = (eventId: string) =>
  prisma.event.update({ where: { id: eventId }, data: { status: EventStatus.FINISHED } });
export const finishEvent = cancelEvent;

// ─── QUERIES ────────────────────────────────────────────────────────────────────
export const getEventById = (input: GetEventByIdInput) =>
  prisma.event.findUniqueOrThrow({
    where: { id: input.id },
    include: {
      category: true,
      organizer: true,
      sessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });

export const listEvents = () =>
  prisma.event.findMany({
    where: { status: EventStatus.OPEN },
    orderBy: { createdAt: "asc" },
    include: {
      category: true,
      organizer: true,
      sessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });

export const listEventsByDate = async (dateString: string) => {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(`${dateString}T23:59:59`);

  const sessions = await prisma.session.findMany({
    where: { date: { gte: start, lte: end }, event: { status: EventStatus.OPEN } },
    include: {
      event: {
        include: {
          category: true,
          organizer: true,
          sessions: true,
          ticketCategories: { include: { seats: true } },
          artists: { include: { artist: true } },
        },
      },
    },
  });

  const unique = new Map<string, (typeof sessions)[number]["event"]>();
  for (const s of sessions) if (s.event && !unique.has(s.event.id)) unique.set(s.event.id, s.event);
  return Array.from(unique.values());
};
