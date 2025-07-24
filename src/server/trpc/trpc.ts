// src/server/trpc/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

// Aqui estava assim (sem transformer):
// const t = initTRPC.context<Context>().create();

const t = initTRPC.context<Context>().create({
  transformer: superjson, // <--- ADICIONE ESTA LINHA!
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
