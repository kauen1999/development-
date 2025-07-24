// src/server/trpc/context.ts
import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";

import { getServerAuthSession } from "../../modules/auth/next-auth/nextauth.session";
import { prisma } from "../db/client";

type CreateContextOptions = {
  session: Session | null;
};

//Build context used internally and in tests
export const createContextInner = async (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
  };
};

//Build context used by tRPC (per request)
export const createContext = async ({ req, res }: CreateNextContextOptions) => {
  const session = await getServerAuthSession({ req, res });

  // Optional logging
  if (!session) {
    console.warn("🔒 Anonymous session detected");
  }

  return createContextInner({ session });
};

export type Context = inferAsyncReturnType<typeof createContext>;
