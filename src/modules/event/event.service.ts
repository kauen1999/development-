import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { EventStatus, EventType } from "@prisma/client";
import type {
  CreateEventInput,
  UpdateEventInput,
  GetEventByIdInput,
} from "./event.schema";
import { TRPCError } from "@trpc/server";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function rowFromCategoryTitle(title: string) {
  const m = title.match(/([A-Za-z])\s*$/);
  return (m?.[1] ?? title.charAt(0) ?? "A").toUpperCase();
}

function buildSeatsByCapacity(args: {
  eventId: string;
  eventSessionId: string;
  ticketCategoryId: string;
  row: string;
  capacity: number;
}): Prisma.SeatCreateManyInput[] {
  const out: Prisma.SeatCreateManyInput[] = [];
  for (let i = 1; i <= args.capacity; i++) {
    out.push({
      eventId: args.eventId,
      eventSessionId: args.eventSessionId,
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

export const createEvent = async (input: CreateEventInput) => {
  const existing = await prisma.event.findUnique({ where: { slug: input.slug } });
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug já existe." });

  const totalCats = sum(input.ticketCategories.map((c) => c.capacity ?? 0));
  if (totalCats > input.capacity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Soma das capacidades das categorias (${totalCats}) excede a capacidade do evento (${input.capacity}).`,
    });
  }

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
        eventSessions: {
          create: input.eventSessions.map((s) => ({
            date: s.date,
            venueName: s.venueName,
            city: s.city,
          })),
        },
      },
      include: { ticketCategories: true, eventSessions: true },
    });

    if (event.eventType === EventType.SEATED) {
      const seatData: Prisma.SeatCreateManyInput[] = [];
      for (const cat of event.ticketCategories) {
        const row = rowFromCategoryTitle(cat.title);
        for (const ses of event.eventSessions) {
          seatData.push(
            ...buildSeatsByCapacity({
              eventId: event.id,
              eventSessionId: ses.id,
              ticketCategoryId: cat.id,
              row,
              capacity: cat.capacity,
            })
          );
        }
      }
      if (seatData.length) await tx.seat.createMany({ data: seatData });
    }

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

  return prisma.event.findUniqueOrThrow({
    where: { id: createdId },
    include: {
      category: true,
      organizer: true,
      eventSessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });
};

export const updateEvent = async (input: UpdateEventInput) => {
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

  const updatedId = await prisma.$transaction(async (tx) => {
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
        ...(input.eventSessions && {
          eventSessions: {
            deleteMany: {},
            create: input.eventSessions.map((s) => ({
              date: s.date,
              venueName: s.venueName,
              city: s.city,
            })),
          },
        }),
      },
    });

    if (input.eventType === EventType.SEATED) {
      await tx.seat.deleteMany({ where: { eventId: input.id } });
      const fresh = await tx.event.findUniqueOrThrow({
        where: { id: input.id },
        include: { eventSessions: true, ticketCategories: true },
      });

      const seatData: Prisma.SeatCreateManyInput[] = [];
      for (const cat of fresh.ticketCategories) {
        const row = rowFromCategoryTitle(cat.title);
        for (const ses of fresh.eventSessions) {
          seatData.push(
            ...buildSeatsByCapacity({
              eventId: fresh.id,
              eventSessionId: ses.id,
              ticketCategoryId: cat.id,
              row,
              capacity: cat.capacity,
            })
          );
        }
      }

      if (seatData.length) await tx.seat.createMany({ data: seatData });
    } else {
      await tx.seat.deleteMany({ where: { eventId: input.id } });
    }

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

  return prisma.event.findUniqueOrThrow({
    where: { id: updatedId },
    include: {
      category: true,
      organizer: true,
      eventSessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });
};

export const cancelEvent = (eventId: string) =>
  prisma.event.update({ where: { id: eventId }, data: { status: EventStatus.FINISHED } });
export const finishEvent = cancelEvent;

export const getEventById = (input: GetEventByIdInput) =>
  prisma.event.findUniqueOrThrow({
    where: { id: input.id },
    include: {
      category: true,
      organizer: true,
      eventSessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });

export const listEvents = (filter?: { status?: EventStatus }) =>
  prisma.event.findMany({
    where: { 
      ...(filter?.status ? { status: filter.status } : {}),
      publishedAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    include: {
      category: true,
      organizer: true,
      eventSessions: true,
      ticketCategories: { include: { seats: true } },
      artists: { include: { artist: true } },
    },
  });

export const listEventsByDate = async (dateString: string) => {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(`${dateString}T23:59:59`);

  const sessions = await prisma.eventSession.findMany({
    where: { date: { gte: start, lte: end }, event: { status: EventStatus.OPEN } },
    include: {
      event: {
        include: {
          category: true,
          organizer: true,
          eventSessions: true,
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

export async function listActiveEventsWithStats(userId: string) {
  const events = await prisma.event.findMany({
    where: {
      organizerId: userId,
      status: "OPEN",
      publishedAt: { lte: new Date() },
    },
    include: {
      ticketCategories: true,
      orders: {
        where: { status: "PAID" },
        include: { orderItems: true },
      },
    },
  });

  return events.map((event) => {
    const categories = event.ticketCategories.map((cat) => {
      const sold = event.orders.reduce((acc, order) => {
        return (
          acc +
          order.orderItems.filter((oi) => oi.ticketCategoryId === cat.id)
            .reduce((sum, oi) => sum + oi.qty, 0)
        );
      }, 0);

      return {
        title: cat.title,
        sold,
        remaining: cat.capacity - sold,
      };
    });

    const totalSold = categories.reduce((acc, c) => acc + c.sold, 0);
    const totalCapacity = categories.reduce(
      (acc, c) => acc + c.remaining + c.sold,
      0
    );

    return {
      id: event.id,
      name: event.name,
      totalSold,
      totalCapacity,
      categories,
    };
  });
}