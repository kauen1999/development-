import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getUserById: protectedProcedure
    .input(z.string().optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findFirst({
        where: {
          id: input,
        },
      });
    }),
  modify: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        DNIName: z.string(),
        DNI: z.string(),
        phone: z.string(),
        birthdate: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.updateMany({
        data: {
          name: input.name,
          DNIName: input.DNIName,
          DNI: input.DNI,
          phone: input.phone,
          birthdate: input.birthdate,
        },
      });
    }),
  modifyName: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid({ message: "Invalid CUID" }),
        name: z.string({
          required_error: "Name is required",
          invalid_type_error: "Name must be a string",
        }),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        if (input) {
          return ctx.prisma.user.update({
            where: { id: input.id },
            data: { name: input.name },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }),
  modifyDNIName: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid({ message: "Invalid CUID" }),
        DNIName: z.string({
          required_error: "Name is required",
          invalid_type_error: "Name must be a string",
        }),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        if (input) {
          return ctx.prisma.user.update({
            where: { id: input.id },
            data: { DNIName: input.DNIName },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }),
  modifyDNI: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid({ message: "Invalid CUID" }),
        DNI: z.string({
          required_error: "Name is required",
          invalid_type_error: "Name must be a string",
        }),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        if (input) {
          return ctx.prisma.user.update({
            where: { id: input.id },
            data: { DNI: input.DNI },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }),
  modifyPhone: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid({ message: "Invalid CUID" }),
        phone: z.string({
          required_error: "Name is required",
          invalid_type_error: "Name must be a string",
        }),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        if (input) {
          return ctx.prisma.user.update({
            where: { id: input.id },
            data: { phone: input.phone },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }),
  modifyBirthdate: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid({ message: "Invalid CUID" }),
        birthdate: z.string({
          required_error: "Name is required",
          invalid_type_error: "Name must be a string",
        }),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        if (input) {
          return ctx.prisma.user.update({
            where: { id: input.id },
            data: { birthdate: input.birthdate },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }),
});
