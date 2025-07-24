// src/server/db/client.ts

import { PrismaClient } from "@prisma/client";
import { env } from "@/env/server.mjs";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalPrisma.prisma = prisma;
}
