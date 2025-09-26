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
 * UPDATE COM GRAPH (evento + sessões)
 * ========================= */
export async function updateEventWithGraph(
  input: UpdateEventWithGraphInput
): Promise<ReturnType<typeof getEventById>> {
  const current = await prisma.event.findUnique({
    where: { id: input.id },
    include: { eventSessions: { select: { id: true } } },
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

  // 🔹 Atualiza apenas dados básicos do evento
  await prisma.event.update({
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

  // 🔹 Sincronizar sessões
  if (input.sessions) {
    const existingSessionIds = current.eventSessions.map((s) => s.id);
    const inputSessionIds = input.sessions
      .map((s) => s.id)
      .filter((id): id is string => Boolean(id));

    // Sessões removidas → deletar com limpeza de FKs
    const sessionsToDelete = existingSessionIds.filter(
      (id) => !inputSessionIds.includes(id)
    );
    if (sessionsToDelete.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.sessionArtist.deleteMany({
          where: { sessionId: { in: sessionsToDelete } },
        });
        await tx.seat.deleteMany({
          where: { eventSessionId: { in: sessionsToDelete } },
        });
        await tx.row.deleteMany({
          where: { eventSessionId: { in: sessionsToDelete } },
        });
        await tx.sector.deleteMany({
          where: { sessionId: { in: sessionsToDelete } },
        });
        await tx.ticketCategory.deleteMany({
          where: { sessionId: { in: sessionsToDelete } },
        });
        await tx.eventSession.deleteMany({
          where: { id: { in: sessionsToDelete } },
        });
      });
    }

    // Sessões novas/atualizadas → upsert
    for (const session of input.sessions) {
      let sessionId: string;
      if (session.id) {
        const updated = await prisma.eventSession.update({
          where: { id: session.id },
          data: {
            dateTimeStart: session.dateTimeStart,
            durationMin: session.durationMin,
            venueName: session.venueName,
            street: session.street,
            number: session.number,
            neighborhood: session.neighborhood ?? "",
            city: session.city,
            state: session.state,
            zip: session.zip,
            country: session.country,
          },
        });
        sessionId = updated.id;
      } else {
        const slug = toSlug(
          `${session.venueName}-${session.dateTimeStart.getTime()}`
        );
        const created = await prisma.eventSession.create({
          data: {
            eventId: input.id,
            slug,
            dateTimeStart: session.dateTimeStart,
            durationMin: session.durationMin,
            venueName: session.venueName,
            street: session.street,
            number: session.number,
            neighborhood: session.neighborhood ?? "",
            city: session.city,
            state: session.state,
            zip: session.zip,
            country: session.country,
          },
        });
        sessionId = created.id;
      }

      // 🔹 se for GENERAL → sincronizar categorias
      if (session.ticketingType === "GENERAL" && "categories" in session) {
        const incomingIds: string[] = session.categories
          .map((c) => c.id)
          .filter((id): id is string => Boolean(id));

        await prisma.ticketCategory.deleteMany({
          where: { sessionId, id: { notIn: incomingIds } },
        });

        for (const c of session.categories) {
          if (c.id) {
            await prisma.ticketCategory.update({
              where: { id: c.id },
              data: {
                title: c.title,
                price: c.price,
                capacity: c.capacity,
                currency: "ARS",
              },
            });
          } else {
            await prisma.ticketCategory.create({
              data: {
                sessionId,
                title: c.title,
                price: c.price,
                capacity: c.capacity,
                currency: "ARS",
              },
            });
          }
        }
      }

      // 🔹 se for SEATED → aqui entraria lógica de setores/assentos
      if (session.ticketingType === "SEATED" && "sectors" in session) {
        for (const sector of session.sectors) {
          await prisma.sector.upsert({
            where: { sessionId_code: { sessionId, code: toSlug(sector.name) } },
            update: { name: sector.name },
            create: {
              sessionId,
              name: sector.name,
              code: toSlug(sector.name),
              order: sector.order ?? 0,
            },
          });
        }
      }
    }
  }

  return prisma.event.findUniqueOrThrow({
    where: { id: input.id },
    include: {
      category: { select: { id: true, title: true } },
      organizer: { select: { id: true, name: true, email: true } },
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
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  slug: true,
                  isGlobal: true,
                  createdByUserId: true,
                },
              },
            },
          },
        },
      },
    },
  });
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
      category: { select: { id: true, title: true } },
      organizer: { select: { id: true, name: true, email: true } },
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
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  slug: true,
                  isGlobal: true,
                  createdByUserId: true,
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
