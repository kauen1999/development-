// prisma/seed.ts
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@admin.com",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin criado:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
