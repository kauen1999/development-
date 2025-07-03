import type { NextApiRequest, NextApiResponse } from "next";
import { loginHandler } from "../../../server/controllers/auth.controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    }

    const result = await loginHandler({ input: { email, password } });

    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}
