// src/pages/api/email/resend.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { AuthService } from "@/modules/auth/service";

// simples anti-abuso em memória (serverless-friendly, mas não perfeito)
// se quiser algo robusto, use Upstash, Redis ou Ratelimit do Supabase
const windowMs = 60_000; // 1 min
const maxPerWindow = 5;  // 5 req / min por IP
const bucket = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = bucket.get(ip);
  if (!rec || now > rec.resetAt) {
    bucket.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= maxPerWindow) return false;
  rec.count++;
  return true;
}

const bodySchema = z.object({
  email: z.string().email(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.setHeader("Allow", "POST").status(405).end("Method Not Allowed");
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (!rateLimit(ip)) {
    return res.status(429).json({ ok: false, message: "Too Many Requests" });
  }

  const parse = bodySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ ok: false, message: "Invalid email" });
  }

  const { email } = parse.data;

  // Importante: resposta genérica (para evitar enumeração de e-mails)
  try {
    await AuthService.requestEmailVerification(email);
  } catch {
    // não vaza detalhes
  }

  // Sempre 200 com mensagem neutra
  return res.status(200).json({
    ok: true,
    message: "Si ese email existe, te enviaremos un enlace de verificación en instantes.",
  });
}
