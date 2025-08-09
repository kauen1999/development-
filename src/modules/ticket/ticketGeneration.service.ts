// src/modules/ticket/ticketGeneration.service.ts
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Gera QR (png) + PDF do ticket e atualiza o registro com URLs ABSOLUTAS.
 * OBS:
 * - Em dev/local funciona gravando em /public/tickets.
 * - Em serverless (ex.: Vercel) o disco é efêmero/read-only; para prod,
 *   suba os arquivos para storage (S3/Supabase) e use a URL pública.
 */
export async function generateTicketAssets(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      session: true,
      seat: true, // pode ser null em GENERAL
      orderItem: {
        include: {
          order: {
            include: { event: true },
          },
        },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const event = ticket.orderItem.order.event;

  // conteúdo do QR (simples e consistente com o endpoint de validação)
  const qrValue = `ticket:${ticket.id}`;
  const qrFilename = `qr-${ticket.id}.png`;
  const pdfFilename = `ticket-${ticket.id}.pdf`;

  // pasta local (dev). Em prod, prefira storage externo.
  const baseDir = path.join(process.cwd(), "public", "tickets");
  const qrPath = path.join(baseDir, qrFilename);
  const pdfPath = path.join(baseDir, pdfFilename);

  // garante a pasta
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // 1) Gera o QR em arquivo
  await QRCode.toFile(qrPath, qrValue);

  // 2) Gera o PDF com o QR embutido
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Cabeçalho básico
  doc.fontSize(20).text(`Evento: ${event.name}`);
  doc.moveDown();
  doc.fontSize(12).text(`Local: ${event.venueName}, ${event.city}`);
  doc.text(`Data: ${ticket.session.date.toLocaleString()}`);

  // SEATED vs GENERAL
  const seatLabel = ticket.seat?.label ?? "General";
  doc.text(`Assento: ${seatLabel}`);
  doc.text(`Ticket ID: ${ticket.id}`);
  doc.moveDown();

  // QR centralizado
  doc.image(qrPath, {
    width: 180,
    align: "center",
  });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  // 3) Atualiza com URLs ABSOLUTAS (melhor para e-mail)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const relativeQr = `/tickets/${qrFilename}`;
  const relativePdf = `/tickets/${pdfFilename}`;

  // se NEXT_PUBLIC_APP_URL estiver setado, cria URL absoluta; senão mantém relativa
  const qrUrl = appUrl ? `${appUrl}${relativeQr}` : relativeQr;
  const pdfUrl = appUrl ? `${appUrl}${relativePdf}` : relativePdf;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: qrUrl,
      pdfUrl: pdfUrl,
    },
  });
}
