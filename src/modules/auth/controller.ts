// src/modules/auth/controller.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { registerSchema, completeProfileSchema } from "./schema";
import { AuthService } from "./service";
import { getToken } from "next-auth/jwt";

// Registro
export async function registerHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const data = registerSchema.parse(req.body);
    const user = await AuthService.registerUser(data);
    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Completar perfil
export async function completeProfileHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = completeProfileSchema.parse(req.body);
    await AuthService.completeUserProfile(token.id as string, data);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
