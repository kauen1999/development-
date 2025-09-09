import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { SeatStatus } from "@prisma/client";

const CART_EXPIRATION_MINUTES = 10;

// ---------------- Adicionar (único) ----------------
export async function addToCartService(
  userId: string,
  eventSessionId: string,
  seatId?: string,
  ticketCategoryId?: string,
  quantity = 1
) {
  if (!seatId && !ticketCategoryId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Debe elegir asiento o categoría.",
    });
  }

  const expiresAt = new Date(Date.now() + CART_EXPIRATION_MINUTES * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    let eventId: string | null = null;

    // Caso SEATED
    if (seatId) {
      const seat = await tx.seat.findUnique({
        where: { id: seatId },
        select: { status: true, eventId: true },
      });

      if (!seat || seat.status !== SeatStatus.AVAILABLE) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Asiento no disponible.",
        });
      }

      eventId = seat.eventId;

      await tx.seat.update({
        where: { id: seatId },
        data: { status: SeatStatus.RESERVED },
      });

      quantity = 1; // SEATED → sempre 1
    }

    // Caso GENERAL
    if (ticketCategoryId) {
      const category = await tx.ticketCategory.findUnique({
        where: { id: ticketCategoryId },
        select: { eventId: true },
      });

      if (!category) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Categoría no encontrada.",
        });
      }

      eventId = category.eventId ?? null;
    }

    if (!eventId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No se pudo determinar el evento del item.",
      });
    }

    return tx.cartItem.create({
      data: {
        userId,
        eventId,
        eventSessionId,
        seatId: seatId ?? undefined,
        ticketCategoryId: ticketCategoryId ?? undefined,
        quantity,
        expiresAt,
      },
    });
  });
}

// ---------------- Adicionar múltiplos ----------------
export async function addManyToCartService(
  userId: string,
  eventId: string,
  eventSessionId: string,
  items: {
    seatId?: string;
    ticketCategoryId?: string;
    quantity?: number;
  }[]
) {
  if (items.length === 0) return [];

  const expiresAt = new Date(Date.now() + CART_EXPIRATION_MINUTES * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const cartItems: {
      userId: string;
      eventId: string;
      eventSessionId: string;
      seatId?: string;
      ticketCategoryId?: string;
      quantity: number;
      expiresAt: Date;
    }[] = [];

    for (const item of items) {
      let quantity = item.quantity ?? 1;

      // Caso SEATED
      if (item.seatId) {
        const seat = await tx.seat.findUnique({
          where: { id: item.seatId },
          select: { status: true },
        });

        if (!seat || seat.status !== SeatStatus.AVAILABLE) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Asiento ${item.seatId} no disponible.`,
          });
        }

        await tx.seat.update({
          where: { id: item.seatId },
          data: { status: SeatStatus.RESERVED },
        });

        quantity = 1; // SEATED → sempre 1
      }

      cartItems.push({
        userId,
        eventId,
        eventSessionId,
        seatId: item.seatId ?? undefined,
        ticketCategoryId: item.ticketCategoryId ?? undefined,
        quantity,
        expiresAt,
      });
    }

    await tx.cartItem.createMany({
      data: cartItems,
      skipDuplicates: true,
    });

    return cartItems;
  });
}

// ---------------- Atualizar cantidad ----------------
export async function updateCartQuantityService(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { seat: true },
  });

  if (!item || item.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Item no encontrado." });
  }

  // SEATED → só pode ter 1
  if (item.seatId) {
    if (quantity <= 0) {
      await prisma.seat.update({
        where: { id: item.seatId },
        data: { status: SeatStatus.AVAILABLE },
      });
      return prisma.cartItem.delete({ where: { id: cartItemId } });
    }
    return item;
  }

  // GENERAL
  if (quantity <= 0) {
    return prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  return prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
    include: {
      eventSession: { include: { event: true } },
      ticketCategory: true,
    },
  });
}

// ---------------- Remover ----------------
export async function removeFromCartService(userId: string, cartItemId: string) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    select: { id: true, seatId: true, userId: true },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Item no encontrado." });
  }

  if (cartItem.seatId) {
    await prisma.seat.update({
      where: { id: cartItem.seatId },
      data: { status: SeatStatus.AVAILABLE },
    });
  }

  return prisma.cartItem.delete({ where: { id: cartItemId } });
}

// ---------------- Listar ----------------
export async function getUserCartService(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      eventSession: { include: { event: true } },
      seat: { include: { ticketCategory: true } },
      ticketCategory: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------- Expirar ----------------
export async function clearExpiredCartService() {
  const now = new Date();

  const expired = await prisma.cartItem.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true, seatId: true },
  });

  if (expired.length === 0) return 0;

  const seatIds = expired.map((i) => i.seatId).filter(Boolean) as string[];

  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { id: { in: expired.map((i) => i.id) } },
    }),
    prisma.seat.updateMany({
      where: { id: { in: seatIds }, status: SeatStatus.RESERVED },
      data: { status: SeatStatus.AVAILABLE },
    }),
  ]);

  return expired.length;
}
