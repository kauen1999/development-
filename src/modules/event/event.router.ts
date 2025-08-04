import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  createEventSchema,
  getEventByIdSchema,
  updateEventSchema,
} from "./event.schema";
import {
  createEvent,
  updateEvent,
  cancelEvent,
  getEventById,
  listEvents,
  listEventsByDate,
} from "./event.service";
import { z } from "zod";

export const eventRouter = router({
  // ✅ ADMIN: Criar evento
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return createEvent(input);
    }),

  // ✅ ADMIN: Atualizar evento
  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return updateEvent(input);
    }),

  // ✅ ADMIN: Cancelar evento (marcar como FINISHED)
  cancel: protectedProcedure
    .input(getEventByIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      return cancelEvent(input.id);
    }),

  // ✅ PÚBLICO: Buscar evento por ID
  getById: publicProcedure
    .input(getEventByIdSchema)
    .query(({ input }) => getEventById(input)),

  // ✅ PÚBLICO: Listar todos eventos OPEN
  list: publicProcedure.query(() => listEvents()),

  // ✅ PÚBLICO: Listar eventos por data de sessão (YYYY-MM-DD)
  listByDate: publicProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(({ input }) => listEventsByDate(input.date)),
});
