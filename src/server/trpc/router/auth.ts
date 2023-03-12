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
        DNIName: z.string(),
        DNI: z.string(),
        phone: z.string(),
        birthdate: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.updateMany({
        data: {
          DNIName: input.DNIName,
          DNI: input.DNI,
          phone: input.phone,
          birthdate: input.birthdate,
        },
      });
    }),
});
