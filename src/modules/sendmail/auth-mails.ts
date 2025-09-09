// src/modules/sendmail/auth-mails.ts
// NÃO use: import "server-only";  // em /pages quebra o build

import nodemailer from "nodemailer";

if (typeof window !== "undefined") {
  throw new Error("auth-mails.ts deve ser importado apenas no servidor.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Base URL para montar links públicos
const RAW_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export function appUrl(path: string) {
  const base = RAW_APP_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMTP
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de template (opcional: só para deixar os e-mails com a mesma cara)
const brand = {
  name: "Entrada Master",
  color: "#111111",
  muted: "#6b7280",
};

function wrapHtml(title: string, bodyHtml: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;box-shadow:0 1px 6px rgba(0,0,0,.06);overflow:hidden;">
      <div style="padding:18px 24px;background:${brand.color};color:#fff;font-weight:700;">
        ${brand.name}
      </div>
      <div style="padding:24px;color:#111827;">
        <h2 style="margin:0 0 8px 0;font-size:20px;">${title}</h2>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="margin:0;color:${brand.muted};font-size:12px">
          Se não foi você, ignore esta mensagem.
        </p>
      </div>
    </div>
    <p style="max-width:560px;margin:16px auto 0;text-align:center;color:${brand.muted};font-size:12px">
      © ${new Date().getFullYear()} ${brand.name}
    </p>
  </div>`;
}

function linkBlock(url: string, label = "Abrir link") {
  const safe = url.replace(/"/g, "&quot;");
  return `
    <p style="margin:16px 0">
      <a href="${safe}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;background:${brand.color};color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600">
        ${label}
      </a>
    </p>
    <p style="color:${brand.muted};font-size:12px;margin-top:12px">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
      <span style="word-break:break-all">${safe}</span>
    </p>
  `;
}

function asText(subject: string, url: string, extra?: string) {
  return [
    subject,
    extra ? `\n${extra}\n` : "",
    "Link:",
    url,
    "\nSe não foi você, ignore esta mensagem.",
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// E-mails
export async function sendVerificationEmail(to: string, link: string) {
  const subject = "Confirme seu e-mail";
  const html = wrapHtml(
    "Confirme seu e-mail",
    `
      <p>Para concluir seu cadastro, clique no botão abaixo:</p>
      ${linkBlock(link, "Confirmar e-mail")}
    `
  );
  await transporter.sendMail({
    from: `"${brand.name}" <${MAIL_FROM}>`,
    to,
    subject,
    html,
    text: asText(subject, link, "Para concluir seu cadastro, acesse:"),
  });
}

export async function sendPasswordResetEmail(to: string, link: string) {
  const subject = "Redefinir sua senha";
  const html = wrapHtml(
    "Redefinir senha",
    `
      <p>Você solicitou a redefinição da sua senha. Clique no botão para continuar:</p>
      ${linkBlock(link, "Redefinir senha")}
      <p style="margin-top:12px;color:${brand.muted};font-size:12px">
        Este link expira em breve por motivos de segurança.
      </p>
    `
  );
  await transporter.sendMail({
    from: `"${brand.name}" <${MAIL_FROM}>`,
    to,
    subject,
    html,
    text: asText(subject, link, "Use o link abaixo para redefinir sua senha:"),
  });
}
