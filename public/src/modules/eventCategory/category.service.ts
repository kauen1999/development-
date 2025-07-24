// src/server/services/category.service.ts

import { prisma } from "@/server/db/client";
import { TRPCError } from "@trpc/server";

/**
 * Helper: Ensure the user is admin before continuing.
 */
async function assertAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can perform this action.",
    });
  }
}

/**
 * Creates a new category. Only accessible by admins.
 */
export const createCategoryService = async (title: string, userId: string) => {
  await assertAdmin(userId);

  if (!title.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Category title cannot be empty.",
    });
  }

  return prisma.category.create({
    data: { title },
  });
};

/**
 * Returns all categories sorted by title.
 */
export const getAllCategoriesService = async () => {
  return prisma.category.findMany({
    orderBy: { title: "asc" },
  });
};

/**
 * Returns a single category by its ID.
 */
export const getCategoryByIdService = async (id: string) => {
  if (!id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Category ID is required.",
    });
  }

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No category found with ID ${id}`,
    });
  }

  return category;
};

/**
 * Deletes a category by ID. Only accessible by admins.
 */
export const deleteCategoryService = async (id: string, userId: string) => {
  await assertAdmin(userId);

  if (!id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Category ID is required.",
    });
  }

  try {
    return await prisma.category.delete({
      where: { id },
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to delete category with ID ${id}`,
      cause: error,
    });
  }
};
