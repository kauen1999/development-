import { prisma } from "../db/client";

export const createCategoryService = async (title: string) => {
  return prisma.category.create({
    data: { title },
  });
};

export const getAllCategoriesService = () => {
  return prisma.category.findMany({
    orderBy: { title: "asc" },
  });
};

export const getCategoryByIdService = (id: string) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

export const deleteCategoryService = (id: string) => {
  return prisma.category.delete({
    where: { id },
  });
};
