import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../server/db/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId é obrigatório na query" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
