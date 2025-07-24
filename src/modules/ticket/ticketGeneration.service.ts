import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { createId } from "@paralleldrive/cuid2";
import { logger } from "@/server/logger";
import type { Prisma } from "@prisma/client";

type TicketAsset = {
  qrCodeUrl: string;
  pdfUrl?: string;
  walletPassUrl?: string;
};

interface TicketData {
  orderId: string;
  userName?: string;
}

//Generates all assets for a ticket: QR code image, PDF with embedded QR, and (optionally) wallet pass.
export async function generateTicketAssets(
  orderId: string,
  tx: Prisma.TransactionClient, // Explicit and safe for use with Prisma $transaction
  ticketData: TicketData
): Promise<TicketAsset> {
  const ticketId = createId();
  const ticketsDir = path.join(process.cwd(), "public", "tickets");

  // Ensure directory exists
  try {
    if (!existsSync(ticketsDir)) {
      mkdirSync(ticketsDir, { recursive: true });
      logger.info("Created directory: /public/tickets");
    }
  } catch (err) {
    logger.error("Failed to create tickets directory:", err);
    throw new Error("Failed to initialize ticket storage directory.");
  }

  // Generate QR code
  const qrFilename = `${ticketId}-qr.png`;
  const qrPath = path.join(ticketsDir, qrFilename);
  const qrCodeUrl = `/tickets/${qrFilename}`;
  const qrCodeContent = `https://entrada.app/validate/${ticketId}`;

  try {
    await QRCode.toFile(qrPath, qrCodeContent);
  } catch (err) {
    logger.error("Failed to generate QR code:", err);
    throw new Error("QR code generation failed.");
  }

  // Generate PDF with ticket details
  const pdfFilename = `${ticketId}.pdf`;
  const pdfPath = path.join(ticketsDir, pdfFilename);
  const pdfUrl = `/tickets/${pdfFilename}`;

  try {
    const doc = new PDFDocument();
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text("Your Ticket", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Order: ${ticketData.orderId}`);
    if (ticketData.userName) {
      doc.text(`Name: ${ticketData.userName}`);
    }
    doc.image(qrPath, { width: 150, align: "center" });

    doc.end();
  } catch (err) {
    logger.error("Failed to generate PDF ticket:", err);
    throw new Error("PDF ticket generation failed.");
  }

  logger.info({ ticketId, qrCodeUrl, pdfUrl }, "Ticket assets generated successfully");

  return {
    qrCodeUrl,
    pdfUrl,
    walletPassUrl: undefined, // Reserved for future Apple/Google Wallet integration
  };
}
