// src/modules/auth/trpcRouter.ts

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { registerSchema, completeProfileSchema } from "./schema";
import { AuthService } from "./service";

// --- Schemas auxiliares para mutações pontuais ---
const modifyNameSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(3),
});
const modifyDniNameSchema = z.object({
  id: z.string().cuid(),
  dniName: z.string().min(3),
});
const modifyDniSchema = z.object({
  id: z.string().cuid(),
  dni: z.string().min(5),
});
const modifyPhoneSchema = z.object({
  id: z.string().cuid(),
  phone: z.string().min(8),
});
const modifyBirthdateSchema = z.object({
  id: z.string().cuid(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// --- Schema de saída padronizado para perfil ---
const userProfileSchema = z.object({
  id: z.string().cuid(),
  name: z.string().nullable(),
  dniName: z.string().nullable(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  birthdate: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

export const authRouter = router({
  // 1) Registrar novo usuário
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.register(input);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }),

  // 2) Login preenche ctx.session (JWT)
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .mutation(async ({ input, ctx }) => {
      await AuthService.login(input, ctx);
      return { success: true };
    }),

  // 3) Completar perfil
  completeProfile: protectedProcedure
    .input(completeProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await AuthService.completeProfile(userId, input);
      return { success: true };
    }),

  // 4) Verificar se perfil está completo
  isProfileComplete: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return AuthService.isProfileComplete(userId);
  }),

  // 5) Buscar dados de perfil
  getUserById: protectedProcedure
    .input(z.string().cuid())
    .output(userProfileSchema)
    .query(async ({ input }) => {
      const user = await AuthService.getUserById(input);
      // Converte Date|null em string|null (YYYY-MM-DD)
      const bdString: string | null = user.birthdate
        ? user.birthdate.toISOString().slice(0, 10)
        : null;

      return {
        id: user.id,
        name: user.name,
        dniName: user.dniName,
        dni: user.dni,
        phone: user.phone,
        birthdate: bdString,
        email: user.email,
        image: user.image,
      };
    }),

  // 6) Modificações pontuais de campo
  modifyName: protectedProcedure
    .input(modifyNameSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.updateName(input);
      return { id: user.id, name: user.name };
    }),

  modifyDniName: protectedProcedure
    .input(modifyDniNameSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.updateDniName(input);
      return { id: user.id, dniName: user.dniName };
    }),

  modifyDni: protectedProcedure
    .input(modifyDniSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.updateDni(input);
      return { id: user.id, dni: user.dni };
    }),

  modifyPhone: protectedProcedure
    .input(modifyPhoneSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.updatePhone(input);
      return { id: user.id, phone: user.phone };
    }),

  modifyBirthdate: protectedProcedure
    .input(modifyBirthdateSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.updateBirthdate(input);
      const bdString: string | null = user.birthdate
        ? user.birthdate.toISOString().slice(0, 10)
        : null;
      return { id: user.id, birthdate: bdString };
    }),

  // 7) Logout (apenas limpa no front via signOut)
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await AuthService.logout(ctx);
    return { success: true };
  }),
});