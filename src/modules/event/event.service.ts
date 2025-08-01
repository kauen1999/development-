// src/modules/event/event.service.ts
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  createEventSchema,
  updateEventSchema,
  getEventByIdSchema,
} from "./event.schema";

export const createEvent = async (input: z.infer<typeof createEventSchema>) => {
  const foundCategories = await prisma.category.findMany({
    where: { id: { in: input.categoryIds } },
    select: { id: true },
  });

  const existingIds = foundCategories.map((cat) => cat.id);
  const missing = input.categoryIds.filter((id) => !existingIds.includes(id));
  if (missing.length > 0) {
    throw new Error(`Invalid categoryIds: ${missing.join(", ")}`);
  }

  const ticketCategoriesWithSeats = input.ticketCategories.map((category) => {
    const rows = category.generateSeats?.rows ?? [];
    const seatsPerRow = category.generateSeats?.seatsPerRow ?? 0;

    const seats = rows.flatMap((row) =>
      Array.from({ length: seatsPerRow }, (_, i) => ({
        label: `${row}${i + 1}`,
        row,
        number: i + 1,
      }))
    );

    return {
      title: category.title,
      price: category.price,
      stock: category.stock,
      seats: {
        create: seats,
      },
    };
  });

  return prisma.event.create({
    data: {
      name: input.name, // atualizado
      description: input.description ?? "",
      city: input.city,
      theater: input.theater,
      price: input.price,
      date: new Date(input.date),
      saleStart: new Date(input.saleStart),
      saleEnd: new Date(input.saleEnd),
      capacity: input.capacity ?? 0,
      slug: input.slug ?? "",
      status: input.status ?? "DRAFT",
      publishedAt: input.publishedAt,
      userId: input.userId,
      categories: {
        connect: input.categoryIds.map((id) => ({ id })),
      },
      ticketCategories: {
        create: ticketCategoriesWithSeats,
      },
    },
    include: {
      categories: true,
      ticketCategories: {
        include: {
          seats: true,
        },
      },
    },
  });
};

export const updateEvent = async (input: z.infer<typeof updateEventSchema>) => {
  const { id, categoryIds, ...rest } = input;

  const allowedFields = [
    "name", "description", "location", "date",
    "saleStart", "saleEnd", "city", "theater",
    "slug", "price", "capacity", "status", "publishedAt"
  ] as const;

  const data = Object.fromEntries(
    Object.entries(rest).filter(([key]) =>
      allowedFields.includes(key as (typeof allowedFields)[number])
    )
  );

  return prisma.event.update({
    where: { id },
    data: {
      ...data,
      categories: categoryIds
        ? {
            set: [],
            connect: categoryIds.map((id) => ({ id })),
          }
        : undefined,
    },
  });
};

export const cancelEvent = async (id: string) => {
  return prisma.event.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
};

export const getEventById = async (input: z.infer<typeof getEventByIdSchema>) => {
  return prisma.event.findUnique({
    where: { id: input.id },
    include: {
      categories: true,
      user: true,
      ticketCategories: {
        include: {
          seats: true,
        },
      },
    },
  });
};

export const listEvents = async () => {
  return prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "asc" },
    include: {
      categories: true,
      user: true,
    },
  });
};

export const listTodayEvents = async () => {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));

  return prisma.event.findMany({
    where: {
      date: { gte: start, lte: end },
      status: "PUBLISHED",
    },
    orderBy: { date: "asc" },
    include: {
      categories: true,
    },
  });
};
