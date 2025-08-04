// src/modules/ticket/ticketGeneration.service.ts
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Gera QR Code + PDF para um ticket
export async function generateTicketAssets(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
      seat: true,
      session: true,
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const qrValue = `ticket:${ticket.id}`;
  const qrFilename = `qr-${ticket.id}.png`;
  const pdfFilename = `ticket-${ticket.id}.pdf`;

  const qrPath = path.join("public", "tickets", qrFilename);
  const pdfPath = path.join("public", "tickets", pdfFilename);

  fs.mkdirSync(path.dirname(qrPath), { recursive: true });

  await QRCode.toFile(qrPath, qrValue);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(18).text(`Ingresso para: ${ticket.event.name}`);
  doc.fontSize(14).text(`Setor: ${ticket.seat.row}`);
  doc.text(`Assento: ${ticket.seat.label}`);
  doc.text(`Data: ${ticket.session.date.toLocaleString()}`);
  doc.text(`Código: ${ticket.id}`);
  doc.moveDown();
  doc.image(qrPath, { width: 120 });

  doc.end();

  await new Promise<void>((resolve) => stream.on("finish", resolve));

  return {
    qrCodeUrl: `/tickets/${qrFilename}`,
    pdfUrl: `/tickets/${pdfFilename}`,
  };
}

// Gera todos os tickets para um pedido
export async function createTicketsForOrder(order: {
  id: string;
  userId: string;
  eventId: string;
  sessionId: string;
  orderItems: {
    seat: {
      id: string;
      label: string;
      row: string | null;
      number: number | null;
      ticketCategoryId: string;
    };
  }[];
}) {
  for (const item of order.orderItems) {
    const { seat } = item;

    // Atualiza status do assento
    await prisma.seat.update({
      where: { id: seat.id },
      data: { status: "SOLD" },
    });

    // Cria ou recupera o OrderItem
    const orderItem = await prisma.orderItem.upsert({
      where: {
        orderId_seatId: {
          orderId: order.id,
          seatId: seat.id,
        },
      },
      update: {},
      create: {
        orderId: order.id,
        seatId: seat.id,
      },
    });

    // Cria o ticket com placeholders temporários
    const ticket = await prisma.ticket.create({
      data: {
        orderItemId: orderItem.id,
        eventId: order.eventId,
        userId: order.userId,
        seatId: seat.id,
        sessionId: order.sessionId,
        qrCodeUrl: "", // será atualizado
      },
    });

    // Gera os arquivos do ingresso
    const assets = await generateTicketAssets(ticket.id);

    // Atualiza com as URLs reais
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        qrCodeUrl: assets.qrCodeUrl,
        pdfUrl: assets.pdfUrl,
      },
    });
  }
}
