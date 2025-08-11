// src/modules/ticket/generateTicketAssets.ts
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Generates and saves the QR code and PDF file for a ticket.
export async function generateTicketAssets(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      eventSession: true, // atualizado: nome do relacionamento correto
      seat: true, // pode ser null em GENERAL
      orderItem: {
        include: {
          order: { include: { event: true } },
        },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const event = ticket.orderItem.order.event;

  const qrValue = `ticket:${ticket.id}`;
  const qrFilename = `qr-${ticket.id}.png`;
  const pdfFilename = `ticket-${ticket.id}.pdf`;

  const ticketsDir = path.join(process.cwd(), "public", "tickets");
  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
  }

  const qrPath = path.join(ticketsDir, qrFilename);
  const pdfPath = path.join(ticketsDir, pdfFilename);

  // Generate QR code image
  await QRCode.toFile(qrPath, qrValue);

  // Generate PDF with embedded QR
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text(`Event: ${event.name}`);
  doc.moveDown();
  doc.fontSize(14).text(`Location: ${event.venueName}, ${event.city}`);
  doc.text(
    `Date: ${ticket.eventSession?.date.toLocaleString() ?? "No date"}`
  );

  // seat pode ser null → usa fallback
  const seatLabel = ticket.seat?.label ?? "General";
  doc.text(`Seat: ${seatLabel}`);

  doc.text(`Ticket ID: ${ticket.id}`);
  doc.moveDown();
  doc.image(qrPath, { width: 150, align: "center" });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  // Update ticket with relative file paths
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: `/tickets/${qrFilename}`,
      pdfUrl: `/tickets/${pdfFilename}`,
    },
  });
}
