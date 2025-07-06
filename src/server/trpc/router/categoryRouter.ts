import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
} from "@/server/services/category.service";

// Schemas de entrada
const categoryIdSchema = z.string().cuid("Invalid category ID");
const categoryCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const categoryRouter = createTRPCRouter({
  /**
   * Create a new category (admin only)
   */
  createCategory: protectedProcedure
    .input(categoryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      return createCategoryService(input.title, userId);
    }),

  /**
   * List all categories (public)
   */
  getAllCategories: publicProcedure.query(async () => {
    return getAllCategoriesService();
  }),

  /**
   * Get a category by ID (public)
   */
  getCategoryById: publicProcedure
    .input(categoryIdSchema)
    .query(async ({ input }) => {
      return getCategoryByIdService(input);
    }),

  /**
   * Delete a category by ID (admin only)
   */
  deleteCategory: protectedProcedure
    .input(categoryIdSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      return deleteCategoryService(input, userId);
    }),
});
