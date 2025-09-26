// src/modules/artist/artist.service.ts
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type { createArtistSchema, UpdateArtistImageInput } from "./artist.schema";

function toCode(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeName(s: string) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchArtists(q: string) {
  const norm = normalizeName(q);

  return prisma.artist.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { normalizedName: { contains: norm } },
      ],
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
}

export async function createArtist(input: z.infer<typeof createArtistSchema>) {
  const normalizedName = normalizeName(input.name);

  const existing = await prisma.artist.findFirst({
    where: { normalizedName },
  });
  if (existing) return existing;

  return prisma.artist.create({
    data: {
      name: input.name,
      slug: toCode(input.name),
      normalizedName,
      isGlobal: true, // 🔥 sempre global
      image: input.image,
      bio: input.bio,
      createdBy: { connect: { id: input.createdByUserId } },
    },
  });
}

export async function updateArtistImage(
  input: UpdateArtistImageInput,
  user: { id: string; role: "ADMIN" | "USER" | "PROMOTER" | "FINANCE" | "SUPPORT" }
) {
  const normalized = normalizeName(input.name);

  const artist = await prisma.artist.findFirst({
    where: { OR: [{ normalizedName: normalized }, { name: input.name }] },
    select: { id: true, createdByUserId: true },
  });

  if (!artist) throw new TRPCError({ code: "NOT_FOUND", message: "Artista não encontrado" });

  const isAdmin = user.role === "ADMIN";
  const isOwner = artist.createdByUserId === user.id;

  if (!isAdmin && !isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Não autorizado a atualizar este artista" });
  }

  await prisma.artist.update({
    where: { id: artist.id },
    data: { image: input.image },
  });

  return { ok: true };
}
