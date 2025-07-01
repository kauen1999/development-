import { prisma } from "../db/client";
import { logger } from "../logging";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const createInvoiceService = async (
  orderId: string,
  cuitOrDni?: string
) => {
  logger.debug({ orderId }, "Generating invoice PDF");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found");

  const pdfDir = path.join(process.cwd(), "public", "invoices");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const pdfPath = path.join(pdfDir, `invoice-${orderId}.pdf`);
  const relativePdfUrl = `/invoices/invoice-${orderId}.pdf`;

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(18).text(`Invoice for Order: ${orderId}`, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Total: $${order.total}`);
  doc.text(`Date: ${order.createdAt.toDateString()}`);
  if (cuitOrDni) doc.text(`CUIT/DNI: ${cuitOrDni}`);
  doc.moveDown();

  doc.text("Items:", { underline: true });
  order.items.forEach((item, index) => {
    doc.text(
      `${index + 1}. Quantity: ${item.quantity}, Price: $${item.price}`
    );
  });

  doc.end();

  const invoice = await prisma.invoice.create({
    data: {
      orderId,
      cuitOrDni,
      pdfUrl: relativePdfUrl,
    },
  });

  return invoice;
};

export const getInvoiceByOrderIdService = async (orderId: string) => {
  return prisma.invoice.findFirst({
    where: { orderId },
  });
};
