import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createId } from "@paralleldrive/cuid2";

import { logger } from "@/server/logging";

type TicketAsset = {
  qrCodeUrl: string;
  pdfUrl?: string;
  walletPassUrl?: string;
};

interface TicketData {
  orderId: string;
  userName?: string;
}

export async function generateTicketAssets(
  orderId: string,
  tx: unknown, // Pode ser ajustado para Prisma.TransactionClient se necessário
  ticketData: TicketData
): Promise<TicketAsset> {
  const ticketId = createId();
  const ticketsDir = path.join(process.cwd(), "public", "tickets");

  try {
    if (!existsSync(ticketsDir)) {
      mkdirSync(ticketsDir, { recursive: true });
      logger.info("📁 Pasta /public/tickets criada.");
    }
  } catch (err) {
    logger.error("❌ Erro ao criar diretório de tickets:", err);
    throw new Error("Falha ao criar diretório de tickets.");
  }

  // Gerar QR Code
  const qrFilename = `${ticketId}-qr.png`;
  const qrPath = path.join(ticketsDir, qrFilename);
  const qrCodeUrl = `/tickets/${qrFilename}`;
  const qrCodeContent = `https://entrada.app/validate/${ticketId}`;

  try {
    await QRCode.toFile(qrPath, qrCodeContent);
  } catch (err) {
    logger.error("❌ Falha ao gerar QR Code:", err);
    throw new Error("Falha ao gerar QR Code.");
  }

  // Gerar PDF
  const pdfFilename = `${ticketId}.pdf`;
  const pdfPath = path.join(ticketsDir, pdfFilename);
  const pdfUrl = `/tickets/${pdfFilename}`;

  try {
    const doc = new PDFDocument();
    const pdfStream = createWriteStream(pdfPath);
    doc.pipe(pdfStream);

    doc.fontSize(20).text("Seu Ingresso", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Pedido: ${ticketData.orderId}`);
    if (ticketData.userName) {
      doc.text(`Nome: ${ticketData.userName}`);
    }
    doc.image(qrPath, { width: 150, align: "center" });

    doc.end();
  } catch (err) {
    logger.error("❌ Falha ao gerar PDF do ticket:", err);
    throw new Error("Falha ao gerar PDF do ticket.");
  }

  logger.info({ ticketId, qrCodeUrl, pdfUrl }, "✅ Assets de ticket gerados");

  return {
    qrCodeUrl,
    pdfUrl,
    walletPassUrl: undefined,
  };
}
