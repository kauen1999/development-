// src/modules/auth/token.service.ts
import crypto from "crypto";
import { prisma } from "@/server/db/client";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const randomToken = (len = 32) => crypto.randomBytes(len).toString("hex");

// ===== Email verification =====
export async function issueEmailVerificationToken(userId: string, ttlMin = 60) {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);

  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });

  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(token: string) {
  const tokenHash = sha256(token);
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!row) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (row.usedAt) return { ok: false as const, reason: "USED" as const };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "EXPIRED" as const };

  await prisma.emailVerificationToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
  return { ok: true as const, userId: row.userId };
}

// ===== Password reset =====
export async function issuepasswordResetToken(userId: string, ttlMin = 30) {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);

  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });

  return { token, expiresAt };
}

export async function consumepasswordResetToken(token: string) {
  const tokenHash = sha256(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (row.usedAt) return { ok: false as const, reason: "USED" as const };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "EXPIRED" as const };

  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
  return { ok: true as const, userId: row.userId };
}
