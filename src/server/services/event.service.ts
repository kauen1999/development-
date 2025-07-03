import { prisma } from "../db/client";
import { TRPCError } from "@trpc/server";

export const createEventService = async (
  input: {
    name: string;
    description: string;
    city: string;
    theater: string;
    price: number;
    date: string;
  },
  userId: string
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.event.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um evento com este nome.",
        });
      }

      return tx.event.create({
        data: {
          name: input.name,
          description: input.description,
          city: input.city,
          theater: input.theater,
          price: input.price,
          date: new Date(input.date),
          userId,
        },
      });
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro ao criar evento.",
      cause: error,
    });
  }
};

export const getAllEventsService = () => {
  return prisma.event.findMany({
    orderBy: { date: "asc" },
  });
};

export const getEventByIdService = (id: string) => {
  return prisma.event.findUnique({
    where: { id },
  });
};

export const enrollUserInEventService = async (userId: string, eventId: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { clients: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento não encontrado",
        });
      }

      const alreadyEnrolled = event.clients.some((u) => u.id === userId);
      if (alreadyEnrolled) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Usuário já está inscrito neste evento",
        });
      }

      await tx.event.update({
        where: { id: eventId },
        data: {
          clients: {
            connect: { id: userId },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: "Inscrição confirmada",
          description: `Você se inscreveu no evento: ${event.name}`,
        },
      });

      return {
        status: "success",
        message: "Inscrição realizada com sucesso",
      };
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro ao inscrever usuário no evento.",
      cause: error,
    });
  }
};
