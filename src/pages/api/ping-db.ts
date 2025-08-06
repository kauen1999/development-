// src/pages/api/ping-db.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Data =
  | { ok: true }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    // Garantimos que err é um Error antes de ler message
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error connecting to database";
    return res.status(500).json({ ok: false, error: message });
  }
}
