// src/modules/auth/service.ts
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { RegisterInput, LoginInput, UpdateProfileInput } from "./auth.schema";

// Cria usuário com senha hasheada
export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email, password: passwordHash },
    select: { id: true, name: true, email: true },
  });

  return user;
}

// Autentica usuário
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.password) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) throw new Error("Invalid credentials");
  // Retorne apenas campos seguros!
  return { id: user.id, name: user.name, email: user.email };
}

// Pega perfil do usuário logado
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, birthdate: true, dni: true, dniName: true, image: true,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
}

// Atualiza perfil
export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, birthdate: true, dni: true, dniName: true, image: true,
    },
  });
  return user;
}
