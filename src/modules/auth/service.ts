// src/modules/auth/service.ts
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";              
import type {
  RegisterInput,
  LoginInput,
  CompleteProfileInput,
  ModifyNameInput,
  ModifyDniNameInput,
  ModifyDniInput,
  ModifyPhoneInput,
  ModifyBirthdateInput,
} from "./schema";
import type { Context } from "@/server/trpc/context";

export class AuthService {
  // Registra um novo usuário com role USER. 
  static async register(data: RegisterInput) {
    const { name, email, password } = data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new Error("E-mail já cadastrado");
    }
    const hash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: { name, email, password: hash, role: "USER" as Role },
    });
  }

  // Autentica e popula ctx.session. 
  static async login(input: LoginInput, ctx: Context) {
    if (!ctx.session) {
      throw new Error("Sessão não inicializada");
    }
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.password) {
      throw new Error("Credenciais inválidas");
    }
    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new Error("Credenciais inválidas");
    }

    ctx.session.user = {
      id: user.id,
      role: user.role,                                // ← já é do tipo Role
      profileCompleted: Boolean(
        user.dniName && user.dni && user.phone && user.birthdate
      ),
      image: user.image ?? "",
    };
    return { success: true };
  }

  // Completa perfil após social login. 
  static async completeProfile(
    userId: string,
    data: CompleteProfileInput
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        dniName: data.dniName,
        dni: data.dni,
        phone: data.phone,
        birthdate: new Date(data.birthdate + "T00:00:00.000Z"),
      },
    });
  }

  // Verifica se o perfil está completo. 
  static async isProfileComplete(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { dni: true, dniName: true, phone: true, birthdate: true },
    });
    return Boolean(u?.dni && u.dniName && u.phone && u.birthdate);
  }

  // Busca dados públicos de um usuário. 
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        dniName: true,
        dni: true,
        phone: true,
        birthdate: true,
      },
    });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return user;
  }

  // Atualiza apenas o nome. 
  static async updateName(input: ModifyNameInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: { name: input.name },
    });
  }

  // Atualiza apenas o nome no documento. 
  static async updateDniName(input: ModifyDniNameInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: { dniName: input.dniName },
    });
  }

  // Atualiza apenas o DNI. 
  static async updateDni(input: ModifyDniInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: { dni: input.dni },
    });
  }

  // Atualiza apenas o telefone. 
  static async updatePhone(input: ModifyPhoneInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: { phone: input.phone },
    });
  }

  // Atualiza apenas a data de nascimento. 
  static async updateBirthdate(input: ModifyBirthdateInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: {
        birthdate: new Date(input.birthdate + "T00:00:00.000Z"),
      },
    });
  }

  // Logout (JWT-only). 
  static async logout(ctx: Context) {
    if (!ctx.session) {
      throw new Error("Sessão não inicializada");
    }
    return { success: true };
  }
}