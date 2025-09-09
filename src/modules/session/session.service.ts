import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { SessionStatus, SessionTicketingType } from "@prisma/client";
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

// ── session CRUD ──────────────────────────────────────────────────────────────
export async function createSession(input: z.infer<typeof createSessionSchema>) {
  // 🔹 gera slug único para a sessão
  const baseSlug = `${toCode(input.venueName)}-${input.dateTimeStart.getTime()}`;
  const slug = await ensureUniqueSlug(baseSlug);

  return prisma.eventSession.create({
    data: {
      eventId: input.eventId,
      slug, // 👈 obrigatório
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
}

export async function updateSession(input: z.infer<typeof updateSessionSchema>) {
  const current = await prisma.eventSession.findUnique({ where: { id: input.id } });
  if (!current) throw new TRPCError({ code: "NOT_FOUND" });
  if (current.status !== SessionStatus.PAUSED) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SESSION_NOT_PAUSED" });
  }

  return prisma.eventSession.update({
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
}

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
  input: z.infer<typeof attachArtistsSchema>,
  opts: { createdByUserId?: string }
) {
  const { sessionId, artists } = input;
  const createdByUserId = opts.createdByUserId;

  for (const name of artists) {
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
      const slug = await ensureUniqueSlug(base);
      artist = await prisma.artist.create({
        data: {
          name,
          slug,
          normalizedName: normalized,
          isGlobal: false,
          createdByUserId: createdByUserId ?? null,
        },
      });
    }

    await prisma.sessionArtist.upsert({
      where: { sessionId_artistId: { sessionId, artistId: artist.id } },
      create: { sessionId, artistId: artist.id, order: 0 },
      update: {},
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
