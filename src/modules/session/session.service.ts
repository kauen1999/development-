// src/modules/session/session.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import {
  SessionStatus,
  SessionTicketingType,
  SeatStatus,
} from "@prisma/client";
import type { z } from "zod";
import type {
  attachArtistsSchema,
  createSessionSchema,
  updateSessionSchema,
  upsertSeatMapSchema,
} from "./session.schema";

// ── helpers ───────────────────────────────────────────────────────────────────
function toCode(name: string) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(base: string) {
  let slug = base;
  let i = 2;
  while (await prisma.eventSession.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function ensureUniqueArtistSlug(base: string) {
  let slug = base;
  let i = 2;
  while (await prisma.artist.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// ── Tipos auxiliares ──────────────────────────────────────────────────────────
type CategoryInput = { id?: string; title: string; price: number; capacity: number };
type RowInput = { id?: string; name: string; seatCount: number; order?: number };
type SectorInput = { id?: string; name: string; rows: RowInput[] };
type ArtistInput = { id: string };

// ── session CRUD ──────────────────────────────────────────────────────────────
export async function createSession(input: z.infer<typeof createSessionSchema>) {
  const baseSlug = `${toCode(input.venueName)}-${input.dateTimeStart.getTime()}`;
  const slug = await ensureUniqueSlug(baseSlug);

  const session = await prisma.eventSession.create({
    data: {
      eventId: input.eventId,
      slug,
      dateTimeStart: input.dateTimeStart,
      durationMin: input.durationMin,
      timezone: input.timezone ?? null,
      venueName: input.venueName,
      street: input.street,
      number: input.number,
      neighborhood: input.neighborhood ?? "",
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      ticketingType: input.ticketingType,
      ticketCategories: {
        create: input.ticketCategories.map((c) => ({
          title: c.title,
          price: c.price,
          capacity: c.capacity ?? 0,
          currency: c.currency ?? "ARS",
        })),
      },
    },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });

  if (input.artists?.length) {
    await attachArtists(
      { sessionId: session.id, artists: input.artists, banners: input.artistBanners ?? {} },
      { createdByUserId: input.createdByUserId }
    );
  }

  return session;
}

export async function updateSession(input: z.infer<typeof updateSessionSchema>) {
  const current = await prisma.eventSession.findUnique({
    where: { id: input.id },
    include: { ticketCategories: true, sectors: { include: { rows: true } } },
  });
  if (!current) throw new TRPCError({ code: "NOT_FOUND" });
  if (current.status !== SessionStatus.PAUSED) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SESSION_NOT_PAUSED" });
  }

  if (input.ticketingType !== current.ticketingType) {
    const hasCats = current.ticketCategories.length > 0;
    const hasSeats = current.sectors.some((s) => s.rows.length > 0);
    if (hasCats || hasSeats) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "CANNOT_CHANGE_TICKETING_TYPE_AFTER_SETUP",
      });
    }
  }

  const session = await prisma.eventSession.update({
    where: { id: input.id },
    data: {
      dateTimeStart: input.dateTimeStart,
      durationMin: input.durationMin,
      timezone: input.timezone,
      venueName: input.venueName,
      street: input.street,
      number: input.number,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      ticketingType: input.ticketingType,
    },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });

  if (input.artists?.length) {
    await attachArtists(
      { sessionId: session.id, artists: input.artists, banners: input.artistBanners ?? {} },
      { createdByUserId: input.createdByUserId }
    );
  }

  return session;
}

export async function deleteSession(sessionId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.eventSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });

    const event = await tx.event.findUnique({ where: { id: session.eventId } });
    if (!event || event.status !== "PAUSED") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "EVENT_NOT_PAUSED" });
    }

    const hasPaidOrders = await tx.order.count({
      where: { eventSessionId: sessionId, status: "PAID" },
    });
    if (hasPaidOrders > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "SESSION_HAS_PAID_ORDERS",
      });
    }

    await tx.sessionArtist.deleteMany({ where: { sessionId } });
    await tx.seat.deleteMany({ where: { eventSessionId: sessionId } });
    await tx.row.deleteMany({ where: { eventSessionId: sessionId } });
    await tx.sector.deleteMany({ where: { sessionId } });
    await tx.ticketCategory.deleteMany({ where: { sessionId } });

    return tx.eventSession.delete({ where: { id: sessionId } });
  });
}

// ── publish / pause / cancel ──────────────────────────────────────────────────
export async function publishSession(sessionId: string) {
  const hasCats = await prisma.ticketCategory.count({ where: { sessionId } });
  if (!hasCats) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SESSION_PUBLISH_BLOCKED_NO_CATEGORIES",
    });
  }
  return prisma.eventSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.PUBLISHED, publishedAt: new Date() },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });
}

export async function pauseSession(sessionId: string) {
  const paid = await prisma.order.count({
    where: { eventSessionId: sessionId, status: "PAID" },
  });
  if (paid > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SESSION_HAS_PAID_ORDERS",
    });
  }
  return prisma.eventSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.PAUSED },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });
}

export async function cancelSession(sessionId: string) {
  const cur = await prisma.eventSession.findUnique({ where: { id: sessionId } });
  if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
  if (cur.status !== SessionStatus.PAUSED) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SESSION_NOT_PAUSED",
    });
  }
  const paid = await prisma.order.count({
    where: { eventSessionId: sessionId, status: "PAID" },
  });
  if (paid > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SESSION_HAS_PAID_ORDERS",
    });
  }

  return prisma.eventSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.CANCELLED },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });
}

// ── attach artists ────────────────────────────────────────────────────────────
export async function attachArtists(
  input: z.infer<typeof attachArtistsSchema> & { banners?: Record<string, string> },
  opts: { createdByUserId?: string }
) {
  const { sessionId, artists, banners = {} } = input;
  const createdByUserId = opts.createdByUserId;

  for (const [idx, name] of artists.entries()) {
    const normalized = name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let artist = await prisma.artist.findFirst({
      where: { normalizedName: normalized, isGlobal: true },
    });

    if (!artist && createdByUserId) {
      artist = await prisma.artist.findFirst({
        where: { normalizedName: normalized, isGlobal: false, createdByUserId },
      });
    }

    if (!artist) {
      const base = toCode(name);
      const slug = await ensureUniqueArtistSlug(base);
      artist = await prisma.artist.create({
        data: {
          name,
          slug,
          normalizedName: normalized,
          isGlobal: true,
          createdByUserId: createdByUserId ?? null,
          image: banners[name] ?? null,
        },
      });
    } else if (banners[name]) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: { image: banners[name] },
      });
    }

    await prisma.sessionArtist.upsert({
      where: { sessionId_artistId: { sessionId, artistId: artist.id } },
      create: { sessionId, artistId: artist.id, order: idx },
      update: { order: idx },
    });
  }

  return prisma.eventSession.findUnique({
    where: { id: sessionId },
    include: {
      ticketCategories: true,
      artists: { include: { artist: true } },
    },
  });
}

// ── seat map ──────────────────────────────────────────────────────────────────
export async function upsertSeatMap(input: z.infer<typeof upsertSeatMapSchema>) {
  const session = await prisma.eventSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw new TRPCError({ code: "NOT_FOUND" });
  if (session.status !== SessionStatus.PAUSED) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SESSION_NOT_PAUSED",
    });
  }
  if (session.ticketingType !== SessionTicketingType.SEATED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SESSION_NOT_SEATED",
    });
  }

  await prisma.$transaction(async (tx) => {
    const cats = await tx.ticketCategory.findMany({ where: { sessionId: input.sessionId } });

    for (const sectorIn of input.sectors) {
      const code = toCode(sectorIn.name);
      const sector = await tx.sector.upsert({
        where: { sessionId_code: { sessionId: input.sessionId, code } },
        create: {
          sessionId: input.sessionId,
          name: sectorIn.name,
          code,
          order: sectorIn.order ?? 0,
          ticketCategoryId: sectorIn.ticketCategoryTitle
            ? cats.find((c) => c.title === sectorIn.ticketCategoryTitle)?.id
            : null,
        },
        update: {
          name: sectorIn.name,
          order: sectorIn.order ?? 0,
          ticketCategoryId: sectorIn.ticketCategoryTitle
            ? cats.find((c) => c.title === sectorIn.ticketCategoryTitle)?.id
            : null,
        },
      });

      for (const rowIn of sectorIn.rows) {
        const row = await tx.row.upsert({
          where: { sectorId_name: { sectorId: sector.id, name: rowIn.name } },
          create: { sectorId: sector.id, name: rowIn.name, order: 0 },
          update: {},
        });

        const categoryId = sector.ticketCategoryId ?? null;
        const ev = await tx.eventSession.findUnique({
          where: { id: input.sessionId },
          select: { eventId: true },
        });
        if (!ev) throw new TRPCError({ code: "NOT_FOUND" });

        for (let k = 1; k <= rowIn.seats; k++) {
          const labelShort = `${rowIn.name}${k}`;
          const labelFull = `${sector.name} ${labelShort}`;
          await tx.seat.upsert({
            where: {
              eventSessionId_labelFull: { eventSessionId: input.sessionId, labelFull },
            },
            create: {
              eventId: ev.eventId,
              eventSessionId: input.sessionId,
              sectorId: sector.id,
              rowId: row.id,
              rowName: rowIn.name,
              number: k,
              status: "AVAILABLE",
              labelShort,
              labelFull,
              ticketCategoryId: categoryId ?? undefined,
            },
            update: {},
          });
        }
      }
    }
  });
}

// ── upsert sessions for event ─────────────────────────────────────────────────
export async function upsertSessionsForEvent(
  eventId: string,
  sessions: Array<{
    id?: string;
    dateTimeStart: Date;
    durationMin: number;
    timezone?: string | null;
    venueName: string;
    street: string;
    number: string;
    neighborhood?: string | null;
    city: string;
    state?: string | null;
    zip?: string | null;
    country: string;
    ticketingType: SessionTicketingType;
    categories?: CategoryInput[];
    sectors?: SectorInput[];
    artists?: ArtistInput[];
  }>
) {
  return prisma.$transaction(async (tx) => {
    const ev = await tx.event.findUnique({ where: { id: eventId } });
    if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });

    const incomingIds = sessions.map((s) => s.id).filter(Boolean) as string[];

    // 🔹 identificar sessões a deletar
    const sessionsToDelete = await tx.eventSession.findMany({
      where: incomingIds.length > 0
        ? { eventId, id: { notIn: incomingIds } }
        : { eventId },
      select: { id: true },
    });
    const idsToDelete = sessionsToDelete.map((s) => s.id);

    if (idsToDelete.length > 0) {
      await tx.sessionArtist.deleteMany({ where: { sessionId: { in: idsToDelete } } });
      await tx.seat.deleteMany({ where: { eventSessionId: { in: idsToDelete } } });
      await tx.row.deleteMany({ where: { eventSessionId: { in: idsToDelete } } });
      await tx.sector.deleteMany({ where: { sessionId: { in: idsToDelete } } });
      await tx.ticketCategory.deleteMany({ where: { sessionId: { in: idsToDelete } } });
      await tx.eventSession.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    // 🔹 processar cada sessão enviada
    for (const s of sessions) {
      let sessionId: string;

      if (s.id) {
        const updated = await tx.eventSession.update({
          where: { id: s.id },
          data: {
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
        sessionId = updated.id;

        const incomingCatIds = (s.categories?.map((c) => c.id).filter((id): id is string => !!id)) ?? [];
        await tx.ticketCategory.deleteMany({
          where: { sessionId, id: { notIn: incomingCatIds } },
        });

        const incomingSectorIds = (s.sectors?.map((sec) => sec.id).filter((id): id is string => !!id)) ?? [];
        await tx.sector.deleteMany({
          where: { sessionId, id: { notIn: incomingSectorIds } },
        });

        const incomingArtistIds = s.artists?.map((a) => a.id) ?? [];
        await tx.sessionArtist.deleteMany({
          where: { sessionId, artistId: { notIn: incomingArtistIds } },
        });
      } else {
        const slug = await ensureUniqueSlug(`${toCode(s.venueName)}-${s.dateTimeStart.getTime()}`);
        const created = await tx.eventSession.create({
          data: {
            eventId,
            slug,
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
        sessionId = created.id;
      }

      // Ticket Categories
      if (s.ticketingType === SessionTicketingType.GENERAL && s.categories) {
        for (const c of s.categories) {
          if (c.id) {
            await tx.ticketCategory.update({
              where: { id: c.id },
              data: { title: c.title, price: c.price, capacity: c.capacity },
            });
          } else {
            await tx.ticketCategory.create({
              data: {
                sessionId,
                title: c.title,
                price: c.price,
                capacity: c.capacity,
              },
            });
          }
        }
      }

      // Sectors + Rows + Seats
      if (s.ticketingType === SessionTicketingType.SEATED && s.sectors) {
        for (const sector of s.sectors) {
          let sectorId: string;
          if (sector.id) {
            const updatedSector = await tx.sector.update({
              where: { id: sector.id },
              data: { name: sector.name, code: toCode(sector.name) },
            });
            sectorId = updatedSector.id;
          } else {
            const createdSector = await tx.sector.create({
              data: {
                sessionId,
                name: sector.name,
                code: toCode(sector.name),
              },
            });
            sectorId = createdSector.id;
          }

          for (const row of sector.rows) {
            let rowId: string;
            if (row.id) {
              const updatedRow = await tx.row.update({
                where: { id: row.id },
                data: { name: row.name, order: row.order ?? 0 },
              });
              rowId = updatedRow.id;
            } else {
              const createdRow = await tx.row.create({
                data: {
                  sectorId,
                  name: row.name,
                  order: row.order ?? 0,
                  eventSessionId: sessionId,
                },
              });
              rowId = createdRow.id;
            }

            const existingSeats = await tx.seat.findMany({
              where: { rowId },
              select: { number: true },
            });
            const existingNumbers = new Set(existingSeats.map((s) => s.number));

            const newSeats = Array.from({ length: row.seatCount }, (_, i) => i + 1)
              .filter((n) => !existingNumbers.has(n))
              .map((seatNumber) => ({
                eventId,
                eventSessionId: sessionId,
                sectorId,
                rowId,
                rowName: row.name,
                number: seatNumber,
                status: SeatStatus.AVAILABLE,
                labelShort: `${row.name}${seatNumber}`,
                labelFull: `${sector.name}-${row.name}${seatNumber}`,
              }));

            if (newSeats.length > 0) {
              await tx.seat.createMany({ data: newSeats });
            }
          }
        }
      }

      // Artists
      if (s.artists) {
        for (const [idx, artist] of s.artists.entries()) {
          await tx.sessionArtist.upsert({
            where: { sessionId_artistId: { sessionId, artistId: artist.id } },
            update: { order: idx },
            create: { sessionId, artistId: artist.id, order: idx },
          });
        }
      }
    }

    return tx.event.findUniqueOrThrow({
      where: { id: eventId },
      include: {
        eventSessions: {
          include: {
            ticketCategories: true,
            artists: { include: { artist: true } },
            sectors: { include: { rows: { include: { seats: true } } } },
          },
        },
      },
    });
  });
}

// ── list by date ──────────────────────────────────────────────────────────────
export async function listEventsByDate(dateISO: string) {
  const start = new Date(`${dateISO}T00:00:00`);
  const end = new Date(`${dateISO}T23:59:59`);
  const sessions = await prisma.eventSession.findMany({
    where: {
      dateTimeStart: { gte: start, lte: end },
      status: SessionStatus.PUBLISHED,
      event: { status: "PUBLISHED" },
    },
    include: {
      event: { include: { category: true, organizer: true } },
    },
  });

  const unique = new Map<string, (typeof sessions)[number]["event"]>();
  for (const s of sessions) {
    if (s.event && !unique.has(s.event.id)) {
      unique.set(s.event.id, s.event);
    }
  }
  return Array.from(unique.values());
}
