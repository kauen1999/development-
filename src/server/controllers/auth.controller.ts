// src/controllers/auth.controller.ts

import { hash } from "bcryptjs";
import { prisma } from "@/server/db/client";
import { TRPCError } from "@trpc/server";
import { type CreateUserInput } from "@/server/schema/user.schema";

export const registerHandler = async ({
  input,
}: {
  input: CreateUserInput;
}) => {
  const { name, email, password } = input;

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "User with this email already exists.",
    });
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "USER", // optional if default is set in Prisma
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return user;
};
