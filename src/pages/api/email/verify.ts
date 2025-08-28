// src/pages/api/email/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { AuthService } from "@/modules/auth/service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.setHeader("Allow", "GET").status(405).end("Method Not Allowed");
  }

  const token = (req.query.token as string) || "";
  if (!token) return res.status(400).send("Missing token");

  const result = await AuthService.verifyEmailToken(token);
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (result === "OK") {
    return res.redirect(302, `${base}/verify-email/success`);
  }
  return res.redirect(302, `${base}/verify-email/error?reason=${encodeURIComponent(result)}`);
}
