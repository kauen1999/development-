import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../server/db/client";

// Testes para criação e listagem de eventos
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { name, description, city, theater, price, date, userId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Requer autenticação (userId)" });
      }

      const event = await prisma.event.create({
        data: {
          name,
          description,
          city,
          theater,
          price,
          date: new Date(date),
          userId,
        },
      });

      return res.status(201).json(event);
    }

    if (req.method === "GET") {
      const events = await prisma.event.findMany({
        orderBy: { date: "asc" },
      });

      return res.status(200).json(events);
    }

    if (req.method === "PUT") {
      const { id } = req.body;
      const event = await prisma.event.findUnique({ where: { id } });

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      return res.status(200).json(event);
    }

    res.status(405).json({ error: "Método não permitido" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
