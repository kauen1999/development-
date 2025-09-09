// src/modules/search/search.service.ts
import { prisma } from "@/lib/prisma";
import { EventStatus } from "@prisma/client";
import type { z } from "zod";
import type { searchInputSchema } from "./search.schema";

// 🔹 Retorna cidades com eventos publicados (ignora status da sessão)
export async function getAvailableCities() {
  const sessions = await prisma.eventSession.findMany({
    where: {
      event: {
        status: EventStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
      },
    },
    select: { city: true },
    distinct: ["city"],
  });

  return sessions.map((s) => s.city).filter(Boolean);
}

// 🔹 Busca global em eventos + artistas
export async function searchGlobal(input: z.infer<typeof searchInputSchema>) {
  const { query, city } = input;

  const events = await prisma.event.findMany({
    where: {
      status: EventStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
      ...(city ? { eventSessions: { some: { city: { equals: city } } } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { category: { title: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      eventSessions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const artists = await prisma.artist.findMany({
    where: {
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      // ✅ Regra adicionada: artista precisa estar em evento publicado
      appearances: {
        some: {
          session: {
            event: {
              status: EventStatus.PUBLISHED,
              publishedAt: { lte: new Date() },
            },
          },
        },
      },
    },
    include: {
      appearances: {
        include: {
          session: {
            include: {
              event: {
                select: { id: true, slug: true, name: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { events, artists };
}
