// src/server/trpc/trpc.ts

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;

// Public procedure — no auth required
export const publicProcedure = t.procedure;

// Middleware — requires authenticated session
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Middleware — requires ADMIN role
const isAdmin = t.middleware(({ ctx, next }) => {
  const user = ctx.session?.user;

  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied",
    });
  }

  return next();
});

// Protected procedure — requires login
export const protectedProcedure = t.procedure.use(isAuthed);

// Admin-only procedure — requires role = ADMIN
export const adminProcedure = protectedProcedure.use(isAdmin);
