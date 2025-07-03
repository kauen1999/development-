import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
} from "@/server/services/category.service";

export const categoryRouter = createTRPCRouter({
  createCategory: protectedProcedure
    .input(z.object({ title: z.string().min(1, "Título é obrigatório") }))
    .mutation(({ input }) => createCategoryService(input.title)),

  getAllCategories: publicProcedure.query(() => getAllCategoriesService()),

  getCategoryById: publicProcedure
    .input(z.string().cuid("ID inválido"))
    .query(({ input }) => getCategoryByIdService(input)),

  deleteCategory: protectedProcedure
    .input(z.string().cuid("ID inválido"))
    .mutation(({ input }) => deleteCategoryService(input)),
});
