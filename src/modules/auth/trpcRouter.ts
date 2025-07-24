// src/modules/auth/trpcRouter.ts
import { router, publicProcedure, protectedProcedure } from "../../server/trpc/trpc";
import { registerSchema, completeProfileSchema } from "./schema";
import { AuthService } from "./service";

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const user = await AuthService.registerUser(input);
      return { id: user.id, email: user.email, name: user.name };
    }),

  completeProfile: protectedProcedure
    .input(completeProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) throw new Error("Unauthorized");
      await AuthService.completeUserProfile(ctx.session.user.id, input);
      return { ok: true };
    }),

  isProfileComplete: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) throw new Error("Unauthorized");
      return await AuthService.isProfileComplete(ctx.session.user.id);
    }),
});
