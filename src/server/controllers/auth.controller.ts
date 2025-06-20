import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { CreateUserInput } from "../schema/user.schema";
import { prisma } from "../db/client";

/**
 * Controlador responsável por registrar um novo usuário local.
 * - Valida entrada com schema Zod
 * - Criptografa a senha com bcrypt
 * - Salva o usuário no banco via Prisma
 * - Retorna apenas dados públicos
 */
export const registerHandler = async ({
  input,
}: {
  input: CreateUserInput;
}) => {
  try {
    // Gera hash da senha (custo de 12 rounds)
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Cria o usuário no banco com dados mínimos e seguros
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
  } catch (error: any) {
    // Erro de chave única (email já cadastrado)
    if (error.code === "P2002") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Correo Electrónico Existente",
      });
    }

    // Propaga qualquer outro erro não tratado
    throw error;
  }
};

/**
 * Controlador de login para autenticação local.
 * - Busca o usuário pelo e-mail
 * - Valida a senha com bcrypt
 * - Retorna os dados públicos do usuário autenticado
 */
export const loginHandler = async ({
  input,
}: {
  input: { email: string; password: string };
}) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Usuário não encontrado ou senha ausente (login social, por exemplo)
  if (!user || !user.password) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas",
    });
  }

  // Verifica se a senha fornecida bate com o hash
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
