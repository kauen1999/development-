import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getUserById: protectedProcedure.input(z.string().optional()).query(({ ctx, input }) => {
    return ctx.prisma.user.findFirst({
      where: {
        id: input,
      },
    });
  }),
});
