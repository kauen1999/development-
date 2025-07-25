// src/modules/auth/auth.router.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import * as authService from "./auth.service";
import { registerSchema, loginSchema } from "./auth.schema";
import { z } from "zod";

// Cadastro
export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      return authService.register(input);
    }),

  // Login
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      return authService.login(input);
    }),

  // Pega perfil
  profile: protectedProcedure
    .query(async ({ ctx }) => {
      return authService.getProfile(ctx.session.user.id);
    }),

  // Atualiza perfil
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      dni: z.string().optional(),
      dniName: z.string().optional(),
      phone: z.string().optional(),
      birthdate: z.string().optional(),
      image: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return authService.updateProfile(ctx.session.user.id, input);
    }),
});
