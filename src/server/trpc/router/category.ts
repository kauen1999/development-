import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";

export const categoryRouter = router({
  // Criação de categoria (autenticado)
  createCategory: protectedProcedure
    .input(z.object({ title: z.string().min(1, "Título é obrigatório") }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.create({
        data: {
          title: input.title,
        },
      });
    }),

  // Listagem de todas as categorias (público)
  getAllCategories: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.category.findMany({
      orderBy: { title: "asc" },
    });
  }),

  // Busca categoria por ID (público)
  getCategoryById: publicProcedure
    .input(z.string().cuid("ID inválido"))
    .query(({ ctx, input }) => {
      return ctx.prisma.category.findUnique({
        where: { id: input },
      });
    }),

  // Deleção de categoria por ID (autenticado)
  deleteCategory: protectedProcedure
    .input(z.string().cuid("ID inválido"))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.delete({
        where: { id: input },
      });
    }),
});
