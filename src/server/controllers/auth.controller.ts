import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import type { CreateUserInput } from "../schema/user.schema";
import { prisma } from "../db/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const registerHandler = async ({ input }: { input: CreateUserInput }) => {
  try {
    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        provider: "local",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Correo Electrónico Existente",
      });
    }

    throw error;
  }
};

export const loginHandler = async ({
  input,
}: {
  input: { email: string; password: string };
}) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.password) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas",
    });
  }

  const passwordValid = await bcrypt.compare(input.password, user.password);

  if (!passwordValid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas",
    });
  }

  return {
    status: "success",
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  };
};
