// src/modules/sendmail/mailer.ts
import nodemailer from "nodemailer";
import type { User, Event, Ticket } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env var ${name} is required`);
  return v;
}

const SMTP_HOST = requireEnv("SMTP_HOST");          // smtp-relay.brevo.com
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = requireEnv("SMTP_USER");          // <id>@smtp-brevo.com (verificado)
const SMTP_PASS = requireEnv("SMTP_PASS");

// opcional: permite definir um from explícito já verificado
const MAIL_FROM = (process.env.MAIL_FROM ?? "").trim() || SMTP_USER;

// Configuração do transporte SMTP Brevo (STARTTLS em 587)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // false em 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  logger: true,              // logs no console
  debug: true,               // logs detalhados
  connectionTimeout: 20_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  tls: { minVersion: "TLSv1.2" },
});

export async function sendTicketEmail(user: User, event: Event, tickets: Ticket[]) {
  if (!user.email) return;

  try {
    console.log(" Testando conexão SMTP...");
    await transporter.verify();
    console.log(" Conexão SMTP verificada com sucesso");

    // Corpo do e-mail
    const list = tickets
      .map((t) => `<li>Ticket <code>${t.id}</code> — QR/PDF em anexo.</li>`)
      .join("");

    // Anexos a partir das URLs (data: ou http(s):)
    const attachments = tickets.flatMap((t) => {
      const files: { filename: string; path: string }[] = [];
      if (t.qrCodeUrl) files.push({ filename: `qr-${t.id}.png`, path: t.qrCodeUrl });
      if (t.pdfUrl) files.push({ filename: `ticket-${t.id}.pdf`, path: t.pdfUrl });
      return files;
    });

    const info = await transporter.sendMail({
      from: `"${event.name}" <${MAIL_FROM}>`, // remetente VERIFICADO na Brevo
      to: user.email,
      subject: ` Seus ingressos - ${event.name}`,
      html: `
        <h2>Compra confirmada</h2>
        <p>Olá, ${user.name ?? "cliente"}! Seus ingressos estão prontos.</p>
        <ul>${list}</ul>
        <p>Apresente o QR Code do PDF na entrada.</p>
      `,
      attachments,
    });

    console.log("Email messageId:", info.messageId);
    console.log("accepted:", info.accepted);
    console.log("rejected:", info.rejected);
    console.log("Resposta SMTP:", info.response);

    if (info.rejected && info.rejected.length) {
      throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
    }
  } catch (error) {
    console.error(" Erro ao enviar e-mail:", error);
    throw error;
  }
}