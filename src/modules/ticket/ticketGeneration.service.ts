import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function generateTicketAssets(
  ticketId: string
): Promise<{ qrCodeUrl: string; pdfUrl: string }> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      session: true,
      seat: true,
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

  const qrValue = `ticket:${ticket.id}`;
  const qrFilename = `qr-${ticket.id}.png`;
  const pdfFilename = `ticket-${ticket.id}.pdf`;

  const baseDir = path.join(process.cwd(), "public", "tickets");
  const qrPath = path.join(baseDir, qrFilename);
  const pdfPath = path.join(baseDir, pdfFilename);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Gera QR
  await QRCode.toFile(qrPath, qrValue);

  // Gera PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text(`Evento: ${event.name}`);
  doc.moveDown();
  doc.fontSize(12).text(`Local: ${event.venueName}, ${event.city}`);
  doc.text(`Data: ${ticket.session.date.toLocaleString()}`);

  const seatLabel = ticket.seat?.label ?? "General";
  doc.text(`Assento: ${seatLabel}`);
  doc.text(`Ticket ID: ${ticket.id}`);
  doc.moveDown();

  doc.image(qrPath, {
    width: 180,
    align: "center",
  });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const relativeQr = `/tickets/${qrFilename}`;
  const relativePdf = `/tickets/${pdfFilename}`;
  const qrUrl = appUrl ? `${appUrl}${relativeQr}` : relativeQr;
  const pdfUrl = appUrl ? `${appUrl}${relativePdf}` : relativePdf;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: qrUrl,
      pdfUrl: pdfUrl,
    },
  });

  return { qrCodeUrl: qrUrl, pdfUrl: pdfUrl };
}
