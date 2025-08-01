import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Generates and saves the QR code and PDF file for a ticket.
 */
export async function generateTicketAssets(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const { event } = ticket.orderItem.order;
  const qrValue = `ticket:${ticket.id}`;
  const qrFilename = `qr-${ticket.id}.png`;
  const pdfFilename = `ticket-${ticket.id}.pdf`;

  const qrPath = path.join(process.cwd(), "public", "tickets", qrFilename);
  const pdfPath = path.join(process.cwd(), "public", "tickets", pdfFilename);

  // Ensure folder exists
  const ticketsFolder = path.dirname(qrPath);
  if (!fs.existsSync(ticketsFolder)) {
    fs.mkdirSync(ticketsFolder, { recursive: true });
  }

  // Generate QR code image
  await QRCode.toFile(qrPath, qrValue);

  // Generate PDF with embedded QR
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text(`Event: ${event.name}`);
  doc.moveDown();
  doc.fontSize(14).text(`Location: ${event.theater}, ${event.city}`);
  doc.text(`Date: ${event.date.toLocaleString()}`);
  doc.text(`Ticket ID: ${ticket.id}`);
  doc.moveDown();
  doc.image(qrPath, { width: 150, align: "center" });

  doc.end();

  await new Promise<void>((resolve) => {
    stream.on("finish", () => resolve());
    });

  // Update ticket with file paths
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: `/tickets/${qrFilename}`,
      pdfUrl: `/tickets/${pdfFilename}`,
    },
  });
}
