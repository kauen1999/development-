// src/modules/ticket/ticket.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { validateTicketSchema } from "./ticket.schema";
import { validateTicketService, listUserTicketsService } from "./ticket.service";

export const ticketRouter = router({

   // Lista tickets do usuário autenticado
  listMyTickets: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return listUserTicketsService(userId);
  }),

  // validate by Ticket ID (legacy)
  validateById: protectedProcedure
    .input(z.object({ ticketId: z.string().cuid("Invalid ticket ID") }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const ticket = await prisma.ticket.findUnique({
        where: { id: input.ticketId },
      });
      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      }
      if (ticket.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket already used" });
      }

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { usedAt: new Date(), validatorId: userId },
      });

      await prisma.validationLog.create({
        data: { ticketId: ticket.id, validatorId: userId },
      });

      return { ok: true, ticketId: updated.id, usedAt: updated.usedAt };
    }),

  // ✅ validate by QR ID (new flow)
  validateByQr: protectedProcedure
    .input(validateTicketSchema)
    .mutation(async ({ input, ctx }) => {
      return validateTicketService(input.qrId, ctx.session.user.id, input.device);
    }),
});
