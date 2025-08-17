// src/server/trpc/context.ts
import type * as trpcNext from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../modules/auth/auth-options";
import { prisma } from "../db/client";

// Minimal production-safe logger interface
type Logger = {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
};

// Console adapter (swap later for pino/winston if you want)
const consoleLogger: Logger = {
  info: (msg, meta) => console.log(msg, meta ?? {}),
  error: (msg, meta) => console.error(msg, meta ?? {}),
};

export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  const session = await getServerSession(opts.req, opts.res, authOptions);
  return {
    req: opts.req,
    res: opts.res,
    prisma,
    session,
    logger: consoleLogger, // ✅ agora o ctx tem logger
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
