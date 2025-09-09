import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";
import type {
  createCategorySchema,
  updateCategorySchema,
  listBySessionSchema,
  getByIdSchema,
  deleteCategorySchema,
} from "./category.schema";
import { SessionStatus, SessionTicketingType } from "@prisma/client";

// Util: quantos ingressos vendidos (PAID) nessa categoria
async function countPaidInCategory(categoryId: string) {
  // Conta via OrderItem + Order.status=PAID
  const agg = await prisma.orderItem.aggregate({
    _sum: { qty: true },
    where: {
      ticketCategoryId: categoryId,
      order: { status: "PAID" },
    },
  });
  return agg._sum.qty ?? 0;
}

// Valida sessão pausada para alterações
async function assertSessionPausedByCategoryId(categoryId: string) {
  const cat = await prisma.ticketCategory.findUnique({
    where: { id: categoryId },
    include: { session: true },
  });
  if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
  if (cat.session.status !== SessionStatus.PAUSED) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SESSION_NOT_PAUSED" });
  }
  return cat;
}


export async function createCategory(input: z.infer<typeof createCategorySchema>) {

  // Enforce unique title per session manualmente para retornar erro amigável
  const exists = await prisma.ticketCategory.findFirst({
    where: { sessionId: input.sessionId, title: input.title },
    select: { id: true },
  });
  if (exists) {
    throw new TRPCError({ code: "CONFLICT", message: "CATEGORY_TITLE_TAKEN" });
  }

  const cat = await prisma.ticketCategory.create({
    data: {
      sessionId: input.sessionId,
      title: input.title,
      price: input.price,
      capacity: input.capacity ?? 0,
      currency: input.currency ?? "ARS",
    },
  });

  // Observação: Em SEATED a capacidade é apenas informativa
  // (não mexemos no mapa de assentos aqui)
  return cat;
}

export async function updateCategory(input: z.infer<typeof updateCategorySchema>) {
  const cat = await assertSessionPausedByCategoryId(input.id);

  // Se há vendas pagas, não permitir mudar title/price
  const paidQty = await countPaidInCategory(cat.id);
  if (paidQty > 0 && (typeof input.title === "string" || typeof input.price === "number")) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "CATEGORY_LOCKED_BY_SALES",
    });
  }

  // Em GENERAL, capacity nunca pode ser menor que o vendido
  if (
    typeof input.capacity === "number" &&
    cat.session.ticketingType === SessionTicketingType.GENERAL &&
    input.capacity < paidQty
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CAPACITY_LT_SOLD",
    });
  }

  // Se vai mudar o título, garanta unicidade na sessão
  if (typeof input.title === "string") {
    const dup = await prisma.ticketCategory.findFirst({
      where: {
        sessionId: cat.sessionId,
        title: input.title,
        NOT: { id: cat.id },
      },
      select: { id: true },
    });
    if (dup) throw new TRPCError({ code: "CONFLICT", message: "CATEGORY_TITLE_TAKEN" });
  }

  return prisma.ticketCategory.update({
    where: { id: cat.id },
    data: {
      title: input.title,
      price: input.price,
      capacity: typeof input.capacity === "number" ? input.capacity : undefined,
      currency: input.currency,
    },
  });
}

export async function listCategoriesBySession(input: z.infer<typeof listBySessionSchema>) {
  return prisma.ticketCategory.findMany({
    where: { sessionId: input.sessionId },
    orderBy: { title: "asc" },
  });
}

export async function getCategoryById(input: z.infer<typeof getByIdSchema>) {
  return prisma.ticketCategory.findUniqueOrThrow({ where: { id: input.id } });
}

export async function deleteCategory(input: z.infer<typeof deleteCategorySchema>) {
  const cat = await assertSessionPausedByCategoryId(input.id);

  // Não pode deletar se houver vendas pagas
  const paidQty = await countPaidInCategory(cat.id);
  if (paidQty > 0) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CATEGORY_LOCKED_BY_SALES" });
  }

  // Em SEATED, também bloqueie se existirem assentos vinculados a esta categoria
  const seatsLinked = await prisma.seat.count({ where: { ticketCategoryId: cat.id } });
  if (seatsLinked > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "CATEGORY_HAS_SEATS_LINKED",
    });
  }

  await prisma.orderItem.deleteMany({
    where: { ticketCategoryId: cat.id, order: { status: "PENDING" } }, // defensivo
  });

  await prisma.ticketCategory.delete({ where: { id: cat.id } });
  return { ok: true };
}
