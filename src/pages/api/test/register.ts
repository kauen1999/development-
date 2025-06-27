import type { NextApiRequest, NextApiResponse } from "next";
import { registerHandler } from "../../../server/controllers/auth.controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, password, cpassword } = req.body;

    if (!name || !email || !password || password !== cpassword) {
      return res.status(400).json({ error: "Dados inválidos ou senhas não coincidem" });
    }

    const result = await registerHandler({
      input: { name, email, password, cpassword },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
