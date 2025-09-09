import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { createLocalArtistSchema, promoteArtistSchema } from "./artist.schema";
import { TRPCError } from "@trpc/server";
import type { UpdateArtistImageInput } from "./artist.schema";
import { EventStatus } from "@prisma/client"; // ✅ enum para filtrar eventos publicados

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
      // ✅ Regra adicionada: artista deve aparecer em pelo menos uma sessão cujo evento está PUBLISHED
      appearances: {
        some: {
          session: {
            event: {
              status: EventStatus.PUBLISHED,
            },
          },
        },
      },
    },
    take: 20,
    orderBy: { isGlobal: "desc" },
  });
}

export async function createLocalArtist(input: z.infer<typeof createLocalArtistSchema>) {
  const normalizedName = normalizeName(input.name);

  return prisma.artist.create({
    data: {
      name: input.name,
      slug: toCode(input.name),
      normalizedName,
      isGlobal: false,
      image: input.image,
      bio: input.bio,
      createdBy: { connect: { id: input.createdByUserId } },
    },
  });
}

export async function promoteToGlobal(input: z.infer<typeof promoteArtistSchema>) {
  const art = await prisma.artist.findUnique({ where: { id: input.artistId } });
  if (!art) throw new TRPCError({ code: "NOT_FOUND" });

  const dup = await prisma.artist.findFirst({
    where: { normalizedName: art.normalizedName, isGlobal: true, NOT: { id: art.id } },
  });
  if (dup) {
    throw new TRPCError({ code: "CONFLICT", message: "ARTIST_DUPLICATE_GLOBAL" });
  }

  return prisma.artist.update({
    where: { id: art.id },
    data: { isGlobal: true, approvedByAdminAt: new Date() },
  });
}

/** ✅ novo: atualizar banner do artista (image) com autorização */
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
  const isOwner = !!artist.createdByUserId && artist.createdByUserId === user.id;

  if (!isAdmin && !isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Não autorizado a atualizar este artista" });
  }

  await prisma.artist.update({
    where: { id: artist.id },
    data: { image: input.image },
  });

  return { ok: true };
}
