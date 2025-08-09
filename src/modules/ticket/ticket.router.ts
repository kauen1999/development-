// src/modules/ticket/ticket.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const ticketRouter = router({
  validate: protectedProcedure
    .input(z.object({ ticketId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const ticket = await prisma.ticket.findUnique({
        where: { id: input.ticketId },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket não encontrado" });
      if (ticket.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket já utilizado" });

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { usedAt: new Date(), validatorId: userId },
      });

      return { ok: true, ticketId: updated.id, usedAt: updated.usedAt };
    }),
});
