// src/modules/category/category.router.ts
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import {
  createCategorySchema,
  updateCategorySchema,
  listBySessionSchema,
  getByIdSchema,
  deleteCategorySchema,
} from "./category.schema";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategoriesBySession,
  updateCategory,
} from "./category.service";

// Apenas ADMIN pode mexer em categorias
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
  }
  return next();
});

export const categoryRouter = router({
  create: adminProcedure.input(createCategorySchema).mutation(({ input }) => createCategory(input)),
  update: adminProcedure.input(updateCategorySchema).mutation(({ input }) => updateCategory(input)),
  delete: adminProcedure.input(deleteCategorySchema).mutation(({ input }) => deleteCategory(input)),

  listBySession: publicProcedure.input(listBySessionSchema).query(({ input }) => listCategoriesBySession(input)),
  getById: publicProcedure.input(getByIdSchema).query(({ input }) => getCategoryById(input)),
});
