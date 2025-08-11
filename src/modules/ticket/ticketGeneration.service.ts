// src/modules/ticket/ticketGeneration.service.ts
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// ✅ Valida variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are not set");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateTicketAssets(
  ticketId: string
): Promise<{ qrCodeUrl: string; pdfUrl: string }> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      eventSession: true, // ✅ nome correto no schema
      seat: true,         // pode ser null
      orderItem: {
        include: {
          order: {
            include: { event: true, user: true },
          },
        },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const event = ticket.orderItem?.order?.event;
  if (!event) throw new Error("Event not found for ticket");

  // Gera QR em buffer
  const qrBuffer = await QRCode.toBuffer(`ticket:${ticket.id}`);

  // Gera PDF em buffer
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text(`Evento: ${event.name}`);
    doc.moveDown();
    doc.fontSize(12).text(`Local: ${event.venueName}, ${event.city}`);

    // Usa eventSession.date
    if (ticket.eventSession?.date) {
      doc.text(`Data: ${ticket.eventSession.date.toLocaleString()}`);
    }

    const seatLabel = ticket.seat?.label ?? "General";
    doc.text(`Assento: ${seatLabel}`);
    doc.text(`Ticket ID: ${ticket.id}`);
    doc.moveDown();

    doc.image(qrBuffer, { width: 180, align: "center" });
    doc.end();
  });

  const qrFilename = `tickets/qr-${ticket.id}.png`;
  const pdfFilename = `tickets/ticket-${ticket.id}.pdf`;

  // Upload QR para Supabase Storage
  const { error: qrError } = await supabase.storage
    .from("tickets")
    .upload(qrFilename, qrBuffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (qrError) throw new Error(`Erro ao enviar QR para Supabase: ${qrError.message}`);

  // Upload PDF para Supabase Storage
  const { error: pdfError } = await supabase.storage
    .from("tickets")
    .upload(pdfFilename, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (pdfError) throw new Error(`Erro ao enviar PDF para Supabase: ${pdfError.message}`);

  // URLs públicas
  const { data: qrData } = supabase.storage.from("tickets").getPublicUrl(qrFilename);
  const { data: pdfData } = supabase.storage.from("tickets").getPublicUrl(pdfFilename);

  const qrCodeUrl = qrData.publicUrl;
  const pdfUrl = pdfData.publicUrl;

  // Atualiza ticket no banco
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { qrCodeUrl, pdfUrl },
  });

  return { qrCodeUrl, pdfUrl };
}
