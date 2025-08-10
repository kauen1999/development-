// src/modules/sendmail/mailer.ts
import nodemailer from "nodemailer";
import type { User, Event, Ticket } from "@prisma/client";
import { env } from "@/env";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env var ${name} is required`);
  return v;
}

const SMTP_HOST = requireEnv("SMTP_HOST");
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = requireEnv("SMTP_USER");
const SMTP_PASS = requireEnv("SMTP_PASS");

// Configuração do transporte SMTP Brevo
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // TLS se porta 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendTicketEmail(user: User, event: Event, tickets: Ticket[]) {
  if (!user.email) return;

  const list = tickets
    .map((t) =>
      t.pdfUrl
        ? `<li><a href="${t.pdfUrl}">Baixar PDF do ticket ${t.id}</a></li>`
        : `<li>Ticket ${t.id}</li>`
    )
    .join("");

  const appUrl =
    env.client.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const fromHost = new URL(appUrl).host;

  await transporter.sendMail({
    from: `"${event.name}" <no-reply@${fromHost}>`,
    to: user.email,
    subject: `🎟 Seus ingressos - ${event.name}`,
    html: `
      <h2>Compra confirmada</h2>
      <p>Olá, ${user.name ?? "cliente"}! Seus ingressos estão prontos.</p>
      <ul>${list}</ul>
      <p>Apresente o QR Code do PDF na entrada.</p>
    `,
  });
}
