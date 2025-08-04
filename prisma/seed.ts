import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "cmdur2yqv0000za0ibt905b3c"; // ✅ substitua se necessário
  const categoryId = "cmduqyc3q000153lf11grmvm7"; // ✅ categoria 'Música'

  const event = await prisma.event.create({
    data: {
      name: "Festival Prisma Rock",
      description: "Um festival imperdível com bandas independentes.",
      slug: "festival-prisma-rock",
      image: "https://source.unsplash.com/800x600/?concert,rock",
      street: "Av. das Palmeiras",
      number: "1000",
      neighborhood: "Centro",
      city: "Belo Horizonte",
      state: "MG",
      zipCode: "30140-120",
      venueName: "Arena BH",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // daqui 7 dias
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      capacity: 100,
      status: "OPEN",
      publishedAt: new Date(),
      userId,
      categoryId,
      ticketCategories: {
        create: [
          {
            title: "Platea A",
            price: 120,
          },
          {
            title: "Platea B",
            price: 80,
          },
        ],
      },
    },
    include: {
      ticketCategories: true,
    },
  });

  console.log("✅ Evento criado com sucesso:");
  console.log(event);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
