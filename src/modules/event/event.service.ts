// src/modules/event/event.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import {
  EventStatus,
  OrderStatus,
  SeatStatus,
  SessionTicketingType,
} from "@prisma/client";
import type {
  CreateEventInput,
  UpdateEventInput,
  UpdateEventWithGraphInput,
} from "./event.schema";

/* =========================
 * Helpers
 * ========================= */
function toSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function generateSessionSlug(eventName: string, date: Date): string {
  const iso = date.toISOString();
  const datePart = iso.split("T")[0] as string;
  return `${toSlug(eventName)}-${datePart.replace(/-/g, "")}-${Date.now()}`;
}

/* =========================
 * CREATE / UPDATE SIMPLES
 * ========================= */
export async function createEvent(input: CreateEventInput) {
  const slug: string = toSlug(input.name);

  const exists = await prisma.event.findUnique({ where: { slug } });
  if (exists) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "El nombre ya existe, el slug generado está en uso.",
    });
  }

  return prisma.event.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      image: input.image,
      startDate: input.startDate,
      endDate: input.endDate,
      status: EventStatus.DRAFT,
      publishedAt: null,
      category: { connect: { id: input.categoryId } },
      organizer: { connect: { id: input.userId } },
    },
  });
}

export async function updateEvent(input: UpdateEventInput) {
  const current = await prisma.event.findUnique({ where: { id: input.id } });
  if (!current) throw new TRPCError({ code: "NOT_FOUND" });

  if (current.status !== EventStatus.PAUSED) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El evento solo puede editarse en estado PAUSED.",
    });
  }

  return prisma.event.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description,
      image: input.image,
      startDate: input.startDate,
      endDate: input.endDate,
      category: input.categoryId
        ? { connect: { id: input.categoryId } }
        : undefined,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image: true,
      startDate: true,
      endDate: true,
      categoryId: true,
      organizerId: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/* =========================
 * UPDATE COM SESSÕES (GRAFO)
 * ========================= */
export async function updateEventWithGraph(
  input: UpdateEventWithGraphInput
): Promise<ReturnType<typeof getEventById>> {
  const current = await prisma.event.findUnique({
    where: { id: input.id },
    include: { eventSessions: true },
  });

  if (!current) throw new TRPCError({ code: "NOT_FOUND" });
  if (current.status !== EventStatus.PAUSED) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El evento solo puede editarse en estado PAUSED.",
    });
  }
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "La fecha de fin no puede ser anterior a la fecha de inicio del evento.",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ev = await tx.event.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        image: input.image,
        startDate: input.startDate,
        endDate: input.endDate,
        category: { connect: { id: input.categoryId } },
      },
    });

    // Remove sessões antigas não presentes
    const currentIds = new Set(current.eventSessions.map((s) => s.id));
    const incomingIds = new Set(
      input.sessions.map((s) => s.id).filter(Boolean) as string[]
    );
    for (const s of current.eventSessions) {
      if (!incomingIds.has(s.id)) {
        await tx.sessionArtist.deleteMany({ where: { sessionId: s.id } });
        await tx.seat.deleteMany({ where: { eventSessionId: s.id } });
        await tx.row.deleteMany({ where: { eventSessionId: s.id } });
        await tx.sector.deleteMany({ where: { sessionId: s.id } });
        await tx.ticketCategory.deleteMany({ where: { sessionId: s.id } });
        await tx.eventSession.delete({ where: { id: s.id } });
      }
    }

    // Upsert sessões
    for (const s of input.sessions) {
      let sessionId: string | null = s.id ?? null;

      if (sessionId && currentIds.has(sessionId)) {
        await tx.eventSession.update({
          where: { id: sessionId },
          data: {
            dateTimeStart: s.dateTimeStart,
            durationMin: s.durationMin,
            timezone: s.timezone,
            venueName: s.venueName,
            street: s.street,
            number: s.number,
            neighborhood: s.neighborhood ?? undefined,
            city: s.city,
            state: s.state,
            zip: s.zip,
            country: s.country,
            ticketingType: s.ticketingType,
          },
        });
      } else {
        const session = await tx.eventSession.create({
          data: {
            eventId: ev.id,
            slug: generateSessionSlug(ev.name, s.dateTimeStart),
            dateTimeStart: s.dateTimeStart,
            durationMin: s.durationMin,
            timezone: s.timezone,
            venueName: s.venueName,
            street: s.street,
            number: s.number,
            neighborhood: s.neighborhood ?? "",
            city: s.city,
            state: s.state ?? "",
            zip: s.zip ?? "",
            country: s.country,
            ticketingType: s.ticketingType,
          },
        });
        sessionId = session.id;
      }

      if (!sessionId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resolve sessionId after creation.",
        });
      }

      // Se for SEATED → cria setores, rows e seats
      if (s.ticketingType === SessionTicketingType.SEATED && "sectors" in s) {
        for (const sector of s.sectors) {
          const createdSector = await tx.sector.create({
            data: {
              sessionId,
              name: sector.name,
              code: toSlug(sector.name),
            },
          });

          for (const row of sector.rows) {
            const createdRow = await tx.row.create({
              data: {
                sectorId: createdSector.id,
                name: row.name,
                order: 0,
                eventSessionId: sessionId,
              },
            });

            const seatsData = Array.from({ length: row.seatCount }, (_, i) => {
              const seatNumber = i + 1;
              return {
                eventId: ev.id,
                eventSessionId: sessionId as string,
                sectorId: createdSector.id,
                rowId: createdRow.id,
                rowName: row.name,
                number: seatNumber,
                status: SeatStatus.AVAILABLE,
                labelShort: `${row.name}${seatNumber}`,
                labelFull: `${sector.name}-${row.name}${seatNumber}`,
              };
            });

            await tx.seat.createMany({ data: seatsData });
          }
        }
      }
    }

    return tx.event.findUniqueOrThrow({
      where: { id: ev.id },
      include: {
        category: true,
        organizer: true,
        eventSessions: {
          orderBy: { dateTimeStart: "asc" },
          include: {
            ticketCategories: {
              select: {
                id: true,
                title: true,
                price: true,
                capacity: true,
                currency: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { tickets: true } },
              },
            },
            artists: {
              include: {
                artist: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    bio: true,
                    image: true,
                  },
                },
              },
            },
            sectors: {
              include: {
                rows: {
                  include: { seats: true },
                },
              },
            },
          },
        },
      },
    });
  });

  return updated;
}

/* =========================
 * PUBLICAR / PAUSAR / CANCELAR
 * ========================= */
export async function publishEvent(eventId: string) {
  const sessions = await prisma.eventSession.findMany({
    where: { eventId },
    include: { ticketCategories: true, seats: true },
  });

  if (sessions.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El evento no tiene sesiones configuradas.",
    });
  }

  for (const s of sessions) {
    if (s.ticketCategories.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "La sesión no tiene categorías de entradas.",
      });
    }

    if (s.ticketingType === SessionTicketingType.GENERAL) {
      const totalCapacity = s.ticketCategories.reduce(
        (acc, c) => acc + (c.capacity ?? 0),
        0
      );
      if (totalCapacity <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "La sesión (General) no tiene capacidad disponible.",
        });
      }
    } else if (s.ticketingType === SessionTicketingType.SEATED) {
      const available = s.seats.filter(
        (seat) => seat.status === SeatStatus.AVAILABLE
      ).length;
      if (available <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "La sesión (Seated) no tiene asientos disponibles.",
        });
      }
    }
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.PUBLISHED, publishedAt: new Date() },
    include: {
      category: true,
      organizer: true,
      eventSessions: {
        orderBy: { dateTimeStart: "asc" },
        include: {
          ticketCategories: {
            select: {
              id: true,
              title: true,
              price: true,
              capacity: true,
              currency: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { tickets: true } },
            },
          },
          seats: true,
          artists: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  bio: true,
                  image: true,
                },
              },
            },
          },
          sectors: {
            include: {
              rows: { include: { seats: true } },
            },
          },
        },
      },
    },
  });
}

export async function pauseEvent(eventId: string) {
  await prisma.$transaction(async (tx) => {
    const paidCount = await tx.order.count({
      where: { eventId, status: OrderStatus.PAID },
    });
    if (paidCount > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "El evento tiene órdenes pagadas y no puede pausarse.",
      });
    }

    const pendingOrders = await tx.order.findMany({
      where: { eventId, status: OrderStatus.PENDING },
      select: { id: true },
    });
    if (pendingOrders.length) {
      const orderIds = pendingOrders.map((o) => o.id);
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: OrderStatus.EXPIRED },
      });
      await tx.seat.updateMany({
        where: { orderItems: { some: { orderId: { in: orderIds } } } },
        data: { status: SeatStatus.AVAILABLE },
      });
      await tx.cartItem.deleteMany({ where: { eventId } });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PAUSED },
    });
  });

  return { success: true };
}

export async function cancelEvent(eventId: string) {
  const ev = await prisma.event.findUnique({ where: { id: eventId } });
  if (!ev) throw new TRPCError({ code: "NOT_FOUND" });

  if (ev.status !== EventStatus.PAUSED) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El evento solo puede cancelarse si está en pausa.",
    });
  }

  const paidCount = await prisma.order.count({
    where: { eventId, status: OrderStatus.PAID },
  });
  if (paidCount > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El evento tiene órdenes pagadas y no puede cancelarse.",
    });
  }

  await prisma.$transaction(async (tx) => {
    const pendingOrders = await tx.order.findMany({
      where: { eventId, status: OrderStatus.PENDING },
      select: { id: true },
    });
    if (pendingOrders.length) {
      const orderIds = pendingOrders.map((o) => o.id);
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.seat.updateMany({
        where: { orderItems: { some: { orderId: { in: orderIds } } } },
        data: { status: SeatStatus.AVAILABLE },
      });
      await tx.cartItem.deleteMany({ where: { eventId } });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { status: EventStatus.CANCELLED },
    });
  });

  return { success: true };
}

/* =========================
 * QUERIES
 * ========================= */
export function getEventById(id: string) {
  return prisma.event.findUniqueOrThrow({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      eventSessions: {
        orderBy: { dateTimeStart: "asc" },
        include: {
          ticketCategories: {
            select: {
              id: true,
              title: true,
              price: true,
              capacity: true,
              currency: true,
            },
          },
          artists: {
            select: {
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
  });
}

export function listEventsPublished() {
  return prisma.event.findMany({
    where: { status: EventStatus.PUBLISHED, publishedAt: { lte: new Date() } },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      organizer: true,
    },
  });
}
