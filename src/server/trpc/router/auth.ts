import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

import { router, publicProcedure, protectedProcedure } from "../trpc";
import { registerHandler } from "../../controllers/auth.controller";
import { createUserSchema } from "../../schema/user.schema";

export const authRouter = router({
  // Retorna a sessão atual (usado no front para manter usuário logado)
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  // Registra novo usuário com validação de entrada
  registerUser: publicProcedure
    .input(createUserSchema)
    .mutation(({ input }) => registerHandler({ input })),

  // Faz login com e-mail e senha usando bcrypt para verificar a senha
  loginUser: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user || !user.password) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      }

      const passwordMatch = await bcrypt.compare(input.password, user.password);
      if (!passwordMatch) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  // Retorna os dados do usuário logado usando a sessão
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          birthdate: true,
          DNI: true,
          DNIName: true,
          image: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      return user;
    }),

  // Atualiza qualquer campo do perfil do usuário (nome, telefone, etc.)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        DNI: z.string().optional(),
        DNIName: z.string().optional(),
        phone: z.string().optional(),
        birthdate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          ...input,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthdate: true,
          DNI: true,
          DNIName: true,
          role: true,
        },
      });

      return updatedUser;
    }),

  // Consulta de um usuário por ID (usada em alguns pontos do front)
  getUserById: protectedProcedure
    .input(z.string().optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findFirst({
        where: {
          id: input,
        },
      });
    }),
});
