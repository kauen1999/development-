import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../server/db/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { eventId, userId } = req.body;

  if (!eventId || !userId) {
    return res.status(400).json({ error: "eventId e userId são obrigatórios" });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { clients: true },
    });

    if (!event) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const alreadyEnrolled = event.clients.some((user) => user.id === userId);
    if (alreadyEnrolled) {
      return res.status(409).json({ error: "Usuário já inscrito" });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        clients: {
          connect: { id: userId },
        },
      },
    });

    return res.status(200).json({ message: "Inscrição realizada com sucesso" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
