import nodemailer from "nodemailer";
import type { User, Event, Ticket } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env var ${name} is required`);
  return v;
}

const SMTP_HOST = requireEnv("SMTP_HOST");
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = requireEnv("SMTP_USER");
const SMTP_PASS = requireEnv("SMTP_PASS");

// remetente (já verificado no provedor)
const MAIL_FROM = (process.env.MAIL_FROM ?? "").trim() || SMTP_USER;

// branding
const MAIL_BRAND_NAME = process.env.MAIL_BRAND_NAME?.trim() || "URBANA TICKETS";
const MAIL_BRAND_LOGO_PATH = process.env.MAIL_BRAND_LOGO_PATH?.trim() || "";
const MAIL_BRAND_LOGO_URL  = process.env.MAIL_BRAND_LOGO_URL?.trim()  || "";
const BRAND_LOGO_CID = "brandlogo@urbana";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  logger: true,
  debug: true,
  connectionTimeout: 20_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  tls: { minVersion: "TLSv1.2" },
});

export async function sendTicketEmail(user: User, event: Event, tickets: Ticket[]) {
  if (!user.email) return;

  // monta attachments dos tickets (QR + PDF)
  const ticketAttachments = tickets.flatMap((t) => {
    const files: { filename: string; path: string }[] = [];
    if (t.qrCodeUrl) files.push({ filename: `qr-${t.id}.png`, path: t.qrCodeUrl });
    if (t.pdfUrl)    files.push({ filename: `ticket-${t.id}.pdf`, path: t.pdfUrl });
    return files;
  });

  // logo embutida via CID (se fornecida por PATH ou URL)
  const hasBrandLogo = Boolean(MAIL_BRAND_LOGO_PATH || MAIL_BRAND_LOGO_URL);
  const brandLogoAttachment = hasBrandLogo
    ? [{
        filename: "brand-logo.png",
        path: MAIL_BRAND_LOGO_PATH || MAIL_BRAND_LOGO_URL,
        cid: BRAND_LOGO_CID,
        contentDisposition: "inline",
      }]
    : [];

  // HTML do e-mail (sem hero de evento, só a logo)
  const html = (() => {
    const headerLogo = hasBrandLogo
      ? `<img src="cid:${BRAND_LOGO_CID}" alt="${MAIL_BRAND_NAME}" width="160" style="display:block;margin:0 auto 8px auto;">`
      : `<div style="font-weight:800;color:#FF5F00;font-size:20px;letter-spacing:0.5px;text-align:center;margin-bottom:8px;">${MAIL_BRAND_NAME}</div>`;

    const li = (label: string, value?: string | null) =>
      value ? `<div style="margin:2px 0;"><span style="color:#64748b;">${label}:</span> <strong>${value}</strong></div>` : "";

    const ticketCards = tickets.map((t, i) => {
      return `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;background:#f8fafc;">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="flex:1;">
              <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">Ticket #${i + 1}</div>
              ${li("ID", t.id)}
              ${li("Categoria", t.ticketCategoryId || "—")}
              ${li("Assento", t.seatId || "—")}
              ${li("Evento", event.name)}
            </div>
            ${
              t.qrCodeUrl
                ? `<img src="${t.qrCodeUrl}" alt="QR" width="96" height="96" style="border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;">`
                : ""
            }
          </div>
          ${
            t.pdfUrl
              ? `<div style="margin-top:10px;">
                  <a href="${t.pdfUrl}" target="_blank" style="display:inline-block;background:#FF5F00;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600;">
                    Descargar PDF del ticket
                  </a>
                 </div>`
              : ""
          }
        </div>
      `;
    }).join("");

    return `
      <div style="background:#f1f5f9;padding:24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;box-shadow:0 6px 22px rgba(15,23,42,.06);padding:24px;">
                <tr>
                  <td style="text-align:center;">
                    ${headerLogo}
                    <div style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 2px 0;">Compra confirmada</div>
                    <div style="color:#64748b;font-size:14px;margin-bottom:16px;">Tus entradas de <strong>${event.name}</strong> están listas.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td>
                    ${ticketCards}
                    <div style="margin-top:16px;color:#475569;font-size:13px;line-height:1.5;">
                      Presenta el QR en el acceso. También adjuntamos los PDF de cada ticket.
                    </div>
                  </td>
                </tr>
                <tr><td style="height:20px;"></td></tr>
                <tr>
                  <td style="text-align:center;color:#94a3b8;font-size:12px;">
                    © ${new Date().getFullYear()} ${MAIL_BRAND_NAME}. Todos los derechos reservados.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`;
  })();

  const text = `Compra confirmada - ${event.name}
${tickets.map((t, i) => `Ticket #${i + 1} - ID: ${t.id}`).join("\n")}
Apresenta o QR no acesso. PDFs anexos.`;

  try {
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${event.name}" <${MAIL_FROM}>`,
      to: user.email,
      subject: `Seus ingressos - ${event.name}`,
      html,
      text,
      attachments: [
        ...brandLogoAttachment,
        ...ticketAttachments,
      ],
    });

    if (info.rejected && info.rejected.length) {
      throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
    }
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    throw error;
  }
}
