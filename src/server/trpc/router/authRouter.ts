// src/server/trpc/router/authRouter.ts

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { registerHandler } from "../../controllers/auth.controller";
import { createUserSchema } from "../../schema/user.schema";

export const authRouter = createTRPCRouter({
  // Get current session (used on frontend to keep user logged in)
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  // Register new user with input validation
  registerUser: publicProcedure
    .input(createUserSchema)
    .mutation(({ input }) => registerHandler({ input })),

  // Get profile of the logged-in user using session
  getProfile: protectedProcedure.query(async ({ ctx }) => {
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
        dni: true,
        dniName: true,
        image: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  // Update any editable user profile field
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        dni: z.string().optional(),
        dniName: z.string().optional(),
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
          dni: true,
          dniName: true,
          role: true,
        },
      });

      return updatedUser;
    }),

  // Fetch a user by ID (used in some frontend flows)
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
