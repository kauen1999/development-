// src/server/services/event.service.ts

import { prisma } from "@/server/db/client";
import { TRPCError } from "@trpc/server";
import slugify from "slugify";

export type CreateEventInput = {
  name: string;
  description: string;
  city: string;
  theater: string;
  price: number;
  date: string;
  saleStart: string;
  saleEnd: string;
  capacity: number;
  ticketCategories: {
    title: string;
    price: number;
    stock: number;
  }[];
};

export type UpdateEventInput = CreateEventInput & {
  eventId: string;
};

export const createEventService = async (
  input: CreateEventInput,
  userId: string
) => {
  try {
    // ✅ Validação da capacidade total vs. ticket stock
    const totalStock = input.ticketCategories.reduce(
      (sum, cat) => sum + cat.stock,
      0
    );

    if (totalStock > input.capacity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Total ticket stock cannot exceed event capacity.",
      });
    }

    let slug = slugify(input.name, { lower: true, strict: true });

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.event.findFirst({
        where: {
          OR: [{ name: input.name }, { slug }],
        },
      });

      if (existing) {
        slug += "-" + Math.random().toString(36).substring(2, 6);
      }

      const event = await tx.event.create({
        data: {
          name: input.name,
          description: input.description,
          city: input.city,
          theater: input.theater,
          price: input.price,
          date: new Date(input.date),
          saleStart: new Date(input.saleStart),
          saleEnd: new Date(input.saleEnd),
          capacity: input.capacity,
          slug,
          userId,
          status: "DRAFT",
          ticketCategories: {
            create: input.ticketCategories.map((cat) => ({
              title: cat.title,
              price: cat.price,
              stock: cat.stock,
            })),
          },
        },
        include: {
          ticketCategories: true,
        },
      });

      return { status: "success", event };
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create event.",
      cause: error,
    });
  }
};

export const updateEventService = async (
  input: UpdateEventInput,
  userId: string
) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: input.eventId } });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }

    if (event.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to update this event.",
      });
    }

    // ✅ Validação de capacidade na atualização
    const totalStock = input.ticketCategories.reduce(
      (sum, cat) => sum + cat.stock,
      0
    );

    if (totalStock > input.capacity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Total ticket stock cannot exceed event capacity.",
      });
    }

    const slug = slugify(input.name, { lower: true, strict: true });

    const updatedEvent = await prisma.event.update({
      where: { id: input.eventId },
      data: {
        name: input.name,
        description: input.description,
        city: input.city,
        theater: input.theater,
        price: input.price,
        date: new Date(input.date),
        saleStart: new Date(input.saleStart),
        saleEnd: new Date(input.saleEnd),
        capacity: input.capacity,
        slug,
        // Se desejar atualizar categorias, adicionar lógica aqui.
      },
    });

    return { status: "success", event: updatedEvent };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update event.",
      cause: error,
    });
  }
};

export const cancelEventService = async (eventId: string, userId: string) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }

    if (event.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not allowed to cancel this event." });
    }

    const cancelled = await prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
    });

    return { status: "success", event: cancelled };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to cancel event.",
      cause: error,
    });
  }
};

export const publishEventService = async (eventId: string, userId: string) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }

    if (event.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not allowed to publish this event." });
    }

    if (event.status !== "DRAFT") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft events can be published." });
    }

    const publishedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: "PUBLISHED" },
    });

    return { status: "success", event: publishedEvent };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to publish event.",
      cause: error,
    });
  }
};

export const getAllEventsService = async () => {
  return prisma.event.findMany({ orderBy: { date: "asc" } });
};

export const getEventByIdService = async (id: string) => {
  if (!id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event ID is required." });
  }

  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: `No event found with ID ${id}` });
  }

  return event;
};

export const enrollUserInEventService = async (userId: string, eventId: string) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
    }

    const existing = await prisma.notification.findFirst({
      where: { userId, title: { contains: event.name } },
    });

    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "User is already enrolled in this event." });
    }

    await prisma.notification.create({
      data: {
        userId,
        title: "Enrollment Confirmed",
        description: `You have successfully enrolled in: ${event.name}`,
      },
    });

    return { status: "success", message: "User successfully enrolled in the event." };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error while enrolling user in the event.",
      cause: error,
    });
  }
};
