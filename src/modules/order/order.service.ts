// src/modules/order/order.service.ts
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput } from "./order.schema";
import { OrderStatus, SeatStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function createOrderService(input: CreateOrderInput, userId: string) {
  const { eventId, sessionId, selectedLabels } = input;

  console.log("Iniciando criação de pedido...");
  console.log("Usuário:", userId);
  console.log("Evento:", eventId);
  console.log("Sessão:", sessionId);
  console.log("Assentos solicitados:", selectedLabels);

  // 1. Verifica se algum assento já foi reservado ou vendido
  const existingSeats = await prisma.seat.findMany({
    where: {
      eventId,
      sessionId,
      label: { in: selectedLabels },
    },
  });

  if (existingSeats.length > 0) {
    const labels = existingSeats.map((s) => s.label).join(", ");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Assentos já reservados ou vendidos: ${labels}`,
    });
  }

  // 2. Busca todas as categorias de ingresso do evento
  const categories = await prisma.ticketCategory.findMany({
    where: { eventId },
  });

  // 3. Monta os dados de cada assento a partir dos labels
  const seatData = selectedLabels.map((label) => {
    const parts = label.split("-");
    if (parts.length !== 2) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Formato inválido do assento: '${label}'. Esperado: 'A1-3'`,
      });
    }

    const [row, numberStr] = parts;

    if (!row || !numberStr) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Dados ausentes no label: '${label}'`,
      });
    }

    const number = parseInt(numberStr);
    if (isNaN(number)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Número inválido no assento: '${label}'`,
      });
    }

    const group = row[0];
    const title = group === "P" ? "Pullman" : `Platea ${group}`;
    const ticketCategory = categories.find((c) => c.title === title);

    if (!ticketCategory) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Categoria de ingresso não encontrada para o assento '${label}'`,
      });
    }

    return {
      label,
      row,
      number,
      status: SeatStatus.RESERVED,
      userId,
      eventId,
      sessionId,
      ticketCategoryId: ticketCategory.id,
    };
  });

  // 4. Calcula o total baseado no preço das categorias
  const total = seatData.reduce((sum, seat) => {
    const cat = categories.find((c) => c.id === seat.ticketCategoryId);
    return sum + (cat?.price || 0);
  }, 0);

  console.log(" Valor total do pedido:", total);
  console.log(" Assentos que serão criados:", seatData.map(s => s.label));

  // 5. Cria o pedido com assentos reservados
  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      sessionId,
      total,
      status: OrderStatus.PENDING,
      orderItems: {
        create: seatData.map((seat) => ({
          seat: { create: seat },
        })),
      },
    },
  });

  console.log(" Pedido criado com sucesso. ID:", order.id);

  return { id: order.id };
}
