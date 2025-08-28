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

// e-mails e tokens
import {
  issueEmailVerificationToken,
  consumeEmailVerificationToken,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  issuepasswordResetToken,
  consumepasswordResetToken,
} from "./token.service";
import { sendVerificationEmail, sendPasswordResetEmail, appUrl } from "@/modules/sendmail/auth-mails";

export class AuthService {
  // Registra e dispara e-mail de verificação (não bloqueia o fluxo se falhar)
  static async register(data: RegisterInput) {
    const { name, email, password } = data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("E-mail já cadastrado");

    const hash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: { name, email, password: hash, role: "USER" as Role },
    });

    try {
      if (created.email) {
        const { token } = await issueEmailVerificationToken(created.id, 60);
        const link = appUrl(`/api/email/verify?token=${encodeURIComponent(token)}`);
        await sendVerificationEmail(created.email, link);
      }
    } catch {
      // logar de forma silenciosa se quiser
    }

    return created;
  }

  // Login por senha (opcionalmente exige e-mail verificado)
  static async login(input: LoginInput, ctx: Context) {
    if (!ctx.session) throw new Error("Sessão não inicializada");

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.password) throw new Error("Credenciais inválidas");

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new Error("Credenciais inválidas");

    if (!user.emailVerified && process.env.ENFORCE_EMAIL_VERIFIED === "true") {
      throw new Error("E-mail não verificado. Verifique sua caixa de entrada.");
    }

    ctx.session.user = {
      id: user.id,
      role: user.role,
      profileCompleted: Boolean(user.dniName && user.dni && user.phone && user.birthdate),
      emailVerified: !!user.emailVerified, 
      image: user.image ?? "",
    };
    return { success: true };
  }

  // Completar perfil
  static async completeProfile(userId: string, data: CompleteProfileInput) {
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

  // Perfil completo?
  static async isProfileComplete(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { dni: true, dniName: true, phone: true, birthdate: true },
    });
    return Boolean(u?.dni && u.dniName && u.phone && u.birthdate);
  }

  // Dados públicos
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
    if (!user) throw new Error("Usuário não encontrado");
    return user;
  }

  // Atualizações pontuais
  static async updateName(input: ModifyNameInput) {
    return prisma.user.update({ where: { id: input.id }, data: { name: input.name } });
  }
  static async updateDniName(input: ModifyDniNameInput) {
    return prisma.user.update({ where: { id: input.id }, data: { dniName: input.dniName } });
  }
  static async updateDni(input: ModifyDniInput) {
    return prisma.user.update({ where: { id: input.id }, data: { dni: input.dni } });
  }
  static async updatePhone(input: ModifyPhoneInput) {
    return prisma.user.update({ where: { id: input.id }, data: { phone: input.phone } });
  }
  static async updateBirthdate(input: ModifyBirthdateInput) {
    return prisma.user.update({
      where: { id: input.id },
      data: { birthdate: new Date(input.birthdate + "T00:00:00.000Z") },
    });
  }

  // ===== Verificação de e-mail =====
  static async requestEmailVerification(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return; // idempotente
    const { token } = await issueEmailVerificationToken(user.id, 60);
    const link = appUrl(`/api/email/verify?token=${encodeURIComponent(token)}`);
    await sendVerificationEmail(email, link);
  }

  static async verifyEmailToken(token: string): Promise<"OK" | "NOT_FOUND" | "USED" | "EXPIRED"> {
    const res = await consumeEmailVerificationToken(token);
    if (!res.ok) return res.reason;
    await prisma.user.update({ where: { id: res.userId }, data: { emailVerified: new Date() } });
    return "OK";
  }

  // ===== Reset de senha =====
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return; // apenas contas com senha local
    const { token } = await issuepasswordResetToken(user.id, 30);
    const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`); // página pública do front
    await sendPasswordResetEmail(email, link);
  }

  static async resetPasswordWithToken(token: string, newPassword: string): Promise<"OK" | "NOT_FOUND" | "USED" | "EXPIRED"> {
    const res = await consumepasswordResetToken(token);
    if (!res.ok) return res.reason;
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: res.userId }, data: { password: hash } });
    return "OK";
  }

  // Logout (JWT-only)
  static async logout(ctx: Context) {
    if (!ctx.session) throw new Error("Sessão não inicializada");
    return { success: true };
  }
}
