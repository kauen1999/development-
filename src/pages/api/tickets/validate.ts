// src/pages/api/tickets/validate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { validateTicketSchema } from "@/modules/ticket/ticket.schema";
import { validateTicketService } from "@/modules/ticket/ticket.service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ensure user is authenticated
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // validate input with zod
    const parsed = validateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const { qrCode, device } = parsed.data;

    // call service
    const result = await validateTicketService(qrCode, session.user.id, device);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Ticket validation error:", err);
    return res.status(400).json({
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
