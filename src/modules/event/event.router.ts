// src/modules/event/event.router.ts
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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

// Centraliza a verificação de ADMIN
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
  return next();
});

export const eventRouter = router({
  // ✅ ADMIN: Criar evento
  create: adminProcedure
    .input(createEventSchema)
    .mutation(({ input }) => createEvent(input)),

  // ✅ ADMIN: Atualizar evento
  update: adminProcedure
    .input(updateEventSchema)
    .mutation(({ input }) => updateEvent(input)),

  // ✅ ADMIN: Cancelar evento (marcar como FINISHED)
  cancel: adminProcedure
    .input(getEventByIdSchema)
    .mutation(({ input }) => cancelEvent(input.id)),

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
