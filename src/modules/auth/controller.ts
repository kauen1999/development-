// src/modules/auth/controller.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  registerSchema,
  completeProfileSchema,
  requestEmailVerificationSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
} from "./schema";
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
    const data = registerSchema.parse(req.body);
    const user = await AuthService.register({
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: "Conta criada. Enviamos um e-mail para confirmação.",
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

/**
 * POST /api/auth/complete-profile
 * Body: { dniName, dni, phone, birthdate }
 * Requires valid JWT (NextAuth)
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

/**
 * POST /api/auth/verify-email/request
 * Body: { email }
 */
export async function requestVerifyEmailHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end();
  }
  try {
    const { email } = requestEmailVerificationSchema.parse(req.body);
    await AuthService.requestEmailVerification(email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ validationErrors: e.format() });
    }
    return res.status(400).json({ error: (e as Error).message || "Bad Request" });
  }
}

/**
 * GET /api/auth/verify-email?token=...
 */
export async function verifyEmailHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = (req.query.token as string | undefined) ?? "";
  if (!token) return res.status(400).json({ error: "Token ausente" });
  const result = await AuthService.verifyEmailToken(token);
  if (result !== "OK") return res.status(400).json({ ok: false, reason: result });
  return res.status(200).json({ ok: true });
}

/**
 * POST /api/auth/password-reset/request
 * Body: { email }
 */
export async function requestPasswordResetHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end();
  }
  try {
    const { email } = requestPasswordResetSchema.parse(req.body);
    await AuthService.requestPasswordReset(email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ validationErrors: e.format() });
    }
    return res.status(400).json({ error: (e as Error).message || "Bad Request" });
  }
}

/**
 * POST /api/auth/password-reset/confirm
 * Body: { token, password, confirmPassword }
 */
export async function confirmPasswordResetHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end();
  }
  try {
    const { token, password } = confirmPasswordResetSchema.parse(req.body);
    const result = await AuthService.resetPasswordWithToken(token, password);
    if (result !== "OK") return res.status(400).json({ ok: false, reason: result });
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ validationErrors: e.format() });
    }
    return res.status(400).json({ error: (e as Error).message || "Bad Request" });
  }
}
