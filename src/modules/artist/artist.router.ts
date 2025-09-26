// src/modules/artist/artist.router.ts
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { createArtistSchema, updateArtistImageSchema } from "./artist.schema";
import { createArtist, searchArtists, updateArtistImage } from "./artist.service";
import { prisma } from "@/lib/prisma";

export const artistRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(({ input }) => searchArtists(input.q)),

  create: protectedProcedure
    .input(createArtistSchema)
    .mutation(({ input }) => createArtist(input)),

  updateImage: protectedProcedure
    .input(updateArtistImageSchema)
    .mutation(({ ctx, input }) =>
      updateArtistImage(input, {
        id: ctx.session.user.id,
        role: ctx.session.user.role,
      })
    ),

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
