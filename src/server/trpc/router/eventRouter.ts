import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createEventService,
  getAllEventsService,
  getEventByIdService,
  enrollUserInEventService,
} from "@/server/services/event.service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const eventRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        city: z.string(),
        theater: z.string(),
        price: z.number().positive("Preço inválido"),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Data inválida",
        }),
      })
    )
    .mutation(({ ctx, input }) => createEventService(input, ctx.session.user.id)),

  getAllEvents: publicProcedure.query(() => getAllEventsService()),

  getEventById: publicProcedure
    .input(z.string().cuid("ID inválido"))
    .query(({ input }) => getEventByIdService(input)),

  enrollInEvent: protectedProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await enrollUserInEventService(ctx.session.user.id, input.eventId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao inscrever usuário",
        });
      }
    }),
});
