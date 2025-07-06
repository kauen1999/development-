import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/server/db/client";

export default async function profileHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const userId = req.query.id;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
