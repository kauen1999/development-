// src/pages/api/auth/password-reset/request.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requestPasswordResetHandler } from "@/modules/auth/controller";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requestPasswordResetHandler(req, res);
}
