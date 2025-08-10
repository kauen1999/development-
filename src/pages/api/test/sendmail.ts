// src/pages/api/test/sendmail.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendTicketEmail } from "@/modules/sendmail/mailer";
import type { User, Event, Ticket } from "@prisma/client";
import { EventStatus, EventType, Role } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fake user conforme seu schema
    const fakeUser: User = {
      id: "user_test",
      email: "jocean.dev@gmail.com", // Coloque seu e-mail real para teste
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

    // Fake event conforme seu schema
    const fakeEvent: Event = {
        id: "event_test",
        number: "0001", // campo único
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


    // Fake tickets conforme seu schema
    const fakeTickets: Ticket[] = [
      {
        id: "ticket_test",
        createdAt: new Date(),
        userId: fakeUser.id,
        sessionId: "session_test",
        eventId: fakeEvent.id,
        seatId: null,
        orderItemId: "order_item_test",
        qrCodeUrl: "https://via.placeholder.com/300x300.png?text=QR+Code",
        pdfUrl: "https://via.placeholder.com/300x300.png?text=Ticket+PDF",
        usedAt: null,
        device: null,
        validatorId: null,
        ticketCategoryId: null,
      },
    ];

    await sendTicketEmail(fakeUser, fakeEvent, fakeTickets);

    res.status(200).json({ success: true, message: "E-mail enviado com sucesso" });
  } catch (err) {
    console.error("Erro ao enviar e-mail de teste:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
