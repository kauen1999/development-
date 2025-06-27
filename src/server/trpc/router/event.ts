import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const eventRouter = router({
  // Criação de evento (requer autenticação)
  createEvent: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        city: z.string(),
        theater: z.string(),
        price: z.string(),
        date: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({
        data: {
          name: input.name,
          description: input.description,
          city: input.city,
          theater: input.theater,
          price: input.price,
          date: new Date(input.date),
          userId: ctx.session.user.id,
        },
      });
    }),

  // Lista todos os eventos (público)
  getAllEvents: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.event.findMany({
      orderBy: { date: "asc" },
    });
  }),

  // Retorna detalhes de um evento por ID (público)
  getEventById: publicProcedure
    .input(z.string().cuid("ID inválido"))
    .query(({ ctx, input }) => {
      return ctx.prisma.event.findUnique({
        where: { id: input },
      });
    }),

  // Inscrição em evento (autenticado)
  enrollInEvent: protectedProcedure
  .input(z.object({ eventId: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    const { eventId } = input;
    const userId = ctx.session.user.id;

    const event = await ctx.prisma.event.findUnique({
      where: { id: eventId },
      include: { clients: true },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
    }

    const alreadyEnrolled = event.clients.some((u) => u.id === userId);
    if (alreadyEnrolled) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Usuário já está inscrito neste evento",
      });
    }

    // Inscreve o usuário no evento
    await ctx.prisma.event.update({
      where: { id: eventId },
      data: {
        clients: {
          connect: { id: userId },
        },
      },
    });

    // Cria notificação de confirmação
    await ctx.prisma.notification.create({
      data: {
        userId: userId,
        title: "Inscrição confirmada",
        description: `Você se inscreveu no evento: ${event.name}`,
      },
    });

    return {
      status: "success",
      message: "Inscrição realizada com sucesso",
    };
  }),
});
