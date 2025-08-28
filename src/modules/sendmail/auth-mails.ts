// src/modules/sendmail/auth-mails.ts
// NÃO use: import "server-only";  // <- isso quebra em pages/

import nodemailer from "nodemailer";

if (typeof window !== "undefined") {
  throw new Error("auth-mails.ts deve ser importado apenas no servidor.");
}

// URLs base para gerar links
const RAW_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

// Construtor de URL seguro
export function appUrl(path: string) {
  const base = RAW_APP_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env var ${name} is required`);
  return v;
}

const SMTP_HOST = requireEnv("SMTP_HOST");
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = requireEnv("SMTP_USER");
const SMTP_PASS = requireEnv("SMTP_PASS");
const MAIL_FROM = (process.env.MAIL_FROM ?? "").trim() || SMTP_USER;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 20_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  tls: { minVersion: "TLSv1.2" },
});

export async function sendVerificationEmail(to: string, link: string) {
  await transporter.sendMail({
    from: `"Entrada Master" <${MAIL_FROM}>`,
    to,
    subject: "Confirme seu e-mail",
    html: `
      <h2>Confirme seu e-mail</h2>
      <p>Para concluir seu cadastro, clique no link abaixo:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></p>
      <p>Se não foi você, ignore esta mensagem.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, link: string) {
  await transporter.sendMail({
    from: `"Entrada Master" <${MAIL_FROM}>`,
    to,
    subject: "Redefinir sua senha",
    html: `
      <h2>Redefinir senha</h2>
      <p>Você solicitou a redefinição da sua senha. Use o link abaixo:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></p>
      <p>Se não foi você, ignore esta mensagem.</p>
    `,
  });
}
