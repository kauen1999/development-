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

/**
 * Unprotected procedure
 **/
export const publicProcedure = t.procedure;

/**
 * Middleware para autenticação de usuários
 */
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

/**
 * Middleware para verificar se o usuário é ADMIN
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  const user = ctx.session?.user;

  if (!user || !('role' in user) || user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  return next();
});

/**
 * Protected procedure
 **/
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Admin-only procedure
 **/
export const adminProcedure = protectedProcedure.use(isAdmin);
