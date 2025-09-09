// src/pages/api/auth/password-reset/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { confirmPasswordResetHandler } from "@/modules/auth/controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return confirmPasswordResetHandler(req, res);
}
