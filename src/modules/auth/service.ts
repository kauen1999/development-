// src/modules/auth/service.ts
import { prisma } from "../../server/db/client";
import * as bcrypt from "bcryptjs";
import type { RegisterInput, CompleteProfileInput } from "./schema";

export class AuthService {
  static async registerUser(data: RegisterInput) {
    const { name, email, password } = data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("E-mail já cadastrado.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, image: "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png" },
    });
    return user;
  }

  static async completeUserProfile(userId: string, data: CompleteProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        dniName: data.dniName,
        dni: data.dni,
        phone: data.phone,
        birthdate: new Date(data.birthdate),
      },
    });
    return user;
  }

  static async isProfileComplete(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return !!(user?.dni && user?.dniName && user?.phone && user?.birthdate);
  }

  static async validateCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return user;
  }
}
