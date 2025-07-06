// src/server/services/user.service.ts
import { prisma } from "../db/client";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

/**
 * Cria um novo usuário com a senha hasheada usando bcrypt.
 * @param input Dados do usuário (com senha em texto plano)
 */
export const createUser = async (input: Prisma.UserCreateInput) => {
  // Hash da senha
  const hashedPassword = await bcrypt.hash(input.password as string, 12);

  const user = await prisma.user.create({
    data: {
      ...input,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      image: true,
      provider: true,
    },
  });

  return user;
};
