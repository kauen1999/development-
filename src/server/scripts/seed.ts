// src/server/scripts/seed.ts
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";

async function main() {
  console.log(" Iniciando seed...");

  // 1) Usuário
  const user = await prisma.user.upsert({
    where: { email: "seed@teste.com" },
    update: {},
    create: {
      name: "Seed User",
      email: "seed@teste.com",
      password: await bcrypt.hash("12345678", 12),
      role: "USER",
    },
  });

  // 2) Categoria
  const category = await prisma.category.upsert({
    where: { title: "Inteira" },
    update: {},
    create: { title: "Inteira" },
  });

  // 3) Evento
  const event = await prisma.event.upsert({
    where: { name: "Evento Seed" },
    update: {},
    create: {
      name: "Evento Seed",
      description: "Descrição do evento seed",
      city: "Cidade Teste",
      theater: "Teatro Seed",
      price: 100,
      date: new Date("2025-07-01T20:00:00.000Z"),
      userId: user.id,
    },
  });

  // 4) TicketCategory
  const ticketCategory = await prisma.ticketCategory.upsert({
    where: { title: "Inteira - Evento Seed" },
    update: {},
    create: {
      title: "Inteira - Evento Seed",
      price: 100,
      stock: 100,
      eventId: event.id,
    },
  });

  // 5) Pedido
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      eventId: event.id,
      total: 100,
      items: {
        create: [
          {
            categoryId: category.id,
            ticketCategoryId: ticketCategory.id,
            quantity: 1,
            price: 100,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log("Seed finalizado com sucesso.");
  console.table({ user: user.email, event: event.name, total: order.total });
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
