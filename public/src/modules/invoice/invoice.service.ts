import { prisma } from "@/server/db/client";
import { logger } from "@/server/logger";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";

/**
 * Generate a PDF invoice for a given order and persist it in the filesystem.
 */
export const createInvoiceService = async (
  orderId: string,
  cuitOrDni?: string
) => {
  logger.debug({ orderId }, "Generating invoice PDF");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Order not found.",
    });
  }

  // Ensure the invoice directory exists
  const pdfDir = path.join(process.cwd(), "public", "invoices");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    logger.info("📁 Invoice directory created at /public/invoices");
  }

  const pdfFilename = `invoice-${orderId}.pdf`;
  const pdfPath = path.join(pdfDir, pdfFilename);
  const relativePdfUrl = `/invoices/${pdfFilename}`;

  try {
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
      doc.text(`${index + 1}. Quantity: ${item.quantity}, Price: $${item.price}`);
    });

    doc.end();
  } catch (err) {
    logger.error("❌ Failed to generate PDF invoice", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate PDF invoice.",
      cause: err,
    });
  }

  try {
    const invoice = await prisma.invoice.create({
      data: {
        orderId,
        cuitOrDni,
        pdfUrl: relativePdfUrl,
      },
    });

    logger.info({ orderId, pdfUrl: relativePdfUrl }, "✅ Invoice created successfully");

    return invoice;
  } catch (err) {
    logger.error("❌ Failed to save invoice to database", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save invoice in database.",
      cause: err,
    });
  }
};

/**
 * Retrieve the invoice associated with an order.
 */
export const getInvoiceByOrderIdService = async (orderId: string) => {
  if (!orderId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Order ID is required.",
    });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { orderId },
  });

  if (!invoice) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice not found for the specified order.",
    });
  }

  return invoice;
};
