// src/pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { prisma } from "@/server/db/client";
import { createUserSchema } from "@/server/schema/user.schema";
import { ZodError } from "zod";

export default async function signupHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const parsed = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const hashedPassword = await hash(parsed.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        password: hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: err.errors });
    }

    console.error("Signup error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
