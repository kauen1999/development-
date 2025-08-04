// src/modules/category/category.router.ts
import { router, publicProcedure } from "@/server/trpc/trpc";
import { prisma } from "@/lib/prisma";

export const categoryRouter = router({
  list: publicProcedure.query(async () => {
    return prisma.category.findMany({
      orderBy: { title: "asc" },
    });
  }),
});
