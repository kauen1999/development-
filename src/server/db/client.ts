// src/server/db/client.ts
import { PrismaClient } from "@prisma/client";

// Added local fallback
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export const baseAppUrl = APP_URL;
