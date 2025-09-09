// src/modules/session/session.router.ts
import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  attachArtistsSchema,
  createSessionSchema,
  listByDateSchema,
  updateSessionSchema,
  upsertSeatMapSchema,
} from "./session.schema";
import {
  attachArtists,
  cancelSession,
  createSession,
  listEventsByDate,
  pauseSession,
  publishSession,
  updateSession,
  upsertSeatMap,
} from "./session.service";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
  return next();
});

export const sessionRouter = router({
  create: adminProcedure.input(createSessionSchema).mutation(({ input }) => createSession(input)),
  update: adminProcedure.input(updateSessionSchema).mutation(({ input }) => updateSession(input)),
  publish: adminProcedure.input(z.object({ id: z.string().cuid() })).mutation(({ input }) => publishSession(input.id)),
  pause:   adminProcedure.input(z.object({ id: z.string().cuid() })).mutation(({ input }) => pauseSession(input.id)),
  cancel:  adminProcedure.input(z.object({ id: z.string().cuid() })).mutation(({ input }) => cancelSession(input.id)),

  // 👇 passa o userId do criador para que o service procure artistas locais dele
  attachArtists: protectedProcedure
    .input(attachArtistsSchema)
    .mutation(({ input, ctx }) =>
      attachArtists(input, { createdByUserId: ctx.session.user.id })
    ),

  upsertSeatMap: adminProcedure.input(upsertSeatMapSchema).mutation(({ input }) => upsertSeatMap(input)),

  listByDate: publicProcedure.input(listByDateSchema).query(({ input }) => listEventsByDate(input.date)),
});
