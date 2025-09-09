// src/modules/artist/artist.router.ts
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createLocalArtistSchema,
  promoteArtistSchema,
  updateArtistImageSchema,
} from "./artist.schema";
import {
  createLocalArtist,
  promoteToGlobal,
  searchArtists,
  updateArtistImage,
} from "./artist.service";
import { prisma } from "@/lib/prisma";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
  return next();
});

export const artistRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(({ input }) => searchArtists(input.q)),

  createLocal: protectedProcedure
    .input(createLocalArtistSchema)
    .mutation(({ input }) => createLocalArtist(input)),

  promoteToGlobal: adminProcedure
    .input(promoteArtistSchema)
    .mutation(({ input }) => promoteToGlobal(input)),

  /** ✅ persistir banner (image) do artista */
  updateImage: protectedProcedure
    .input(updateArtistImageSchema)
    .mutation(({ ctx, input }) =>
      updateArtistImage(input, {
        id: ctx.session.user.id,
        role: ctx.session.user.role,
      })
    ),

  /** ✅ nova rota: lista artistas + sessões futuras */
  listWithSessions: publicProcedure.query(async () => {
    const artists = await prisma.artist.findMany({
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
      take: 10,
    });

    const now = new Date();
    return artists.map((a) => ({
      ...a,
      appearances: a.appearances.filter(
        (app) => app.session && app.session.dateTimeStart >= now
      ),
    }));
  }),
});
