// src/server/trpc/context.ts
import type * as trpcNext from '@trpc/server/adapters/next';
import { getServerSession } from "next-auth";
import { authOptions } from "../../modules/auth/auth-options";
import { prisma } from "../db/client";

export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  const session = await getServerSession(opts.req, opts.res, authOptions);
  return {
    req: opts.req,
    res: opts.res,
    prisma,
    session,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
