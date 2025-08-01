import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function generateTicketAssets(ticketId: string) {
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

  if (!ticket) throw new Error("Ticket não encontrado");

  const qrValue = `ticket:${ticket.id}`;
  const qrPath = path.join(process.cwd(), "public", "tickets", `qr-${ticket.id}.png`);
  const pdfPath = path.join(process.cwd(), "public", "tickets", `ticket-${ticket.id}.pdf`);

  await QRCode.toFile(qrPath, qrValue);

  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  const { event } = ticket.orderItem.order;
  doc.fontSize(20).text(`Ingresso para: ${event.name}`);
  doc.fontSize(14).text(`Data: ${event.date.toLocaleString()}`);
  doc.text(`Local: ${event.theater}, ${event.city}`);
  doc.text(`Código do Ingresso: ${ticket.id}`);
  doc.image(qrPath, { width: 150, align: "center" });

  doc.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      qrCodeUrl: `/tickets/qr-${ticket.id}.png`,
      pdfUrl: `/tickets/ticket-${ticket.id}.pdf`,
    },
  });
}
