import { prisma } from "../../../server/db/client";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Teste REST: Criação e listagem de categorias
 * - POST: Cria uma nova categoria (body: { title })
 * - GET: Lista todas as categorias
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { title } = req.body;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Título inválido" });
      }

      const category = await prisma.category.create({
        data: { title },
      });

      return res.status(201).json(category);
    }

    if (req.method === "GET") {
      const categories = await prisma.category.findMany();
      return res.status(200).json(categories);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
