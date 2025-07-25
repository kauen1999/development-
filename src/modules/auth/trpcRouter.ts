// src/modules/auth/trpcRouter.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../server/trpc/trpc";
import { registerSchema, completeProfileSchema } from "./schema";
import { AuthService } from "./service";

// ===== SCHEMAS AUXILIARES =====

const modifyNameSchema = z.object({ id: z.string(), name: z.string().min(3) });
const modifydniNameSchema = z.object({ id: z.string(), dniName: z.string().min(3) });
const modifydniSchema = z.object({ id: z.string(), dni: z.string().min(3) });
const modifyPhoneSchema = z.object({ id: z.string(), phone: z.string().min(8) });
const modifyBirthdateSchema = z.object({ id: z.string(), birthdate: z.string().min(8) });

export const authRouter = router({
  // REGISTRO
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.registerUser(input);
      return { id: user.id, email: user.email, name: user.name };
    }),

  // COMPLETAR PERFIL
  completeProfile: protectedProcedure
    .input(completeProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) throw new Error("Unauthorized");
      await AuthService.completeUserProfile(ctx.session.user.id, input);
      return { ok: true };
    }),

  // VERIFICAR PERFIL COMPLETO
  isProfileComplete: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) throw new Error("Unauthorized");
      return await AuthService.isProfileComplete(ctx.session.user.id);
    }),

  // GET USER BY ID (profile)
  getUserById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input },
        select: {
          id: true,
          name: true,
          dniName: true,
          dni: true,
          phone: true,
          birthdate: true,
          email: true,
          image: true,
          // Adicione aqui mais campos se seu profile precisar
        },
      });
      if (!user) throw new Error("User not found");
      return user;
    }),

  // EDITAR NOME DE USUÁRIO
  modifyName: protectedProcedure
    .input(modifyNameSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { name: input.name },
      });
      return { id: user.id, name: user.name };
    }),

  // EDITAR NOME DO DOCUMENTO
  modifydniName: protectedProcedure
    .input(modifydniNameSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { dniName: input.dniName },
      });
      return { id: user.id, dniName: user.dniName };
    }),

  // EDITAR dni
  modifydni: protectedProcedure
    .input(modifydniSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { dni: input.dni },
      });
      return { id: user.id, dni: user.dni };
    }),

  // EDITAR TELEFONE
  modifyPhone: protectedProcedure
    .input(modifyPhoneSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { phone: input.phone },
      });
      return { id: user.id, phone: user.phone };
    }),

  // EDITAR DATA DE NASCIMENTO
  modifyBirthdate: protectedProcedure
    .input(modifyBirthdateSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { birthdate: new Date(input.birthdate) },
      });
      return { id: user.id, birthdate: user.birthdate };
    }),
});
