// src/modules/auth/controller.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { registerSchema, completeProfileSchema } from "./schema";
import { AuthService } from "./service";
import { getToken } from "next-auth/jwt";
import { ZodError } from "zod";

/**
 * POST /api/auth/register
 * Body: { name, email, password, confirmPassword }
 */
export async function registerHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end();
  }

  try {
    // valida payload e passwords matching
    const data = registerSchema.parse(req.body);
    // registra e retorna o usuário criado
    const user = await AuthService.register({
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword, // embora o service ignore confirmPassword
    });
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ validationErrors: err.format() });
    }
    // erro de negócio (e-mail duplicado, etc)
    return res
      .status(400)
      .json({ error: (err as Error).message ?? "Bad Request" });
  }
}

/**
 * POST /api/auth/complete-profile
 * Body: { dniName, dni, phone, birthdate }
 * Requires valid JWT (NextAuth) in cookies/Authorization header
 */
export async function completeProfileHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = completeProfileSchema.parse(req.body);
    const updated = await AuthService.completeProfile(token.id, data);

    // Garantir que birthdate não é nulo antes de chamar toISOString
    const birthdateIso = updated.birthdate
      ? updated.birthdate.toISOString()
      : null;

    return res.status(200).json({
      ok: true,
      updatedFields: {
        dniName: updated.dniName,
        dni: updated.dni,
        phone: updated.phone,
        birthdate: birthdateIso,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ validationErrors: err.format() });
    }
    return res
      .status(400)
      .json({ error: (err as Error).message ?? "Bad Request" });
  }
}
