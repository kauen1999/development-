// src/pages/api/test/sendmail.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { User, Event, Ticket } from "@prisma/client";
import { EventStatus, EventType, Role } from "@prisma/client";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

// Função auxiliar para gerar PDF em memória e retornar URL fake
async function generateFakePdf(ticketId: string): Promise<string> {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.text(`Ticket ID: ${ticketId}`);
  doc.text("Evento Teste");
  doc.text("Este é um PDF de teste para envio por e-mail.");
  doc.end();

  return new Promise((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      // Aqui poderíamos salvar no Supabase Storage, mas para teste usamos Data URI
      const base64 = buffer.toString("base64");
      resolve(`data:application/pdf;base64,${base64}`);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fake user
    const fakeUser: User = {
      id: "user_test",
      email: "kauen212@gmail.com",
      name: "Usuário Teste",
      emailVerified: null,
      image: null,
      password: null,
      dniName: null,
      dni: null,
      phone: null,
      birthdate: null,
      provider: null,
      role: Role.USER,
      createdAt: new Date(),
    };

    // Fake event
    const fakeEvent: Event = {
      id: "event_test",
      number: "0001",
      name: "Evento Teste",
      slug: "evento-teste",
      description: null,
      image: null,
      city: "Cidade Teste",
      state: "SP",
      venueName: "Local Teste",
      zipCode: "00000-000",
      neighborhood: "Centro",
      street: "Rua Teste",
      capacity: 100,
      status: EventStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: "cat_test",
      organizerId: "user_test",
      publishedAt: new Date(),
      eventType: EventType.GENERAL,
    };

    // Gera QR Code fake
    const qrCodeUrl = await QRCode.toDataURL(`TicketID:${"ticket_test"}`);

    // Gera PDF fake
    const pdfUrl = await generateFakePdf("ticket_test");

    // Fake ticket com links reais
    const fakeTickets: Ticket[] = [
      {
        id: "ticket_test",
        createdAt: new Date(),
        userId: fakeUser.id,
        sessionId: "session_test",
        eventId: fakeEvent.id,
        seatId: null,
        orderItemId: "order_item_test",
        qrCodeUrl,
        pdfUrl,
        usedAt: null,
        device: null,
        validatorId: null,
        ticketCategoryId: null,
      },
    ];

    // Envia o e-mail real
    await sendTicketEmail(fakeUser, fakeEvent, fakeTickets);

    res.status(200).json({ success: true, message: "E-mail enviado com QR Code e PDF fake" });
  } catch (err) {
    console.error("Erro ao enviar e-mail de teste:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
