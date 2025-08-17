import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { PagoticService } from "./pagotic.service";
import { buildCreatePayloadFromOrder, assertRfc822Tz } from "./pagotic.utils";
import { GetPaymentResponseSchema } from "./pagotic.schema";
import type { PrismaClient } from "@prisma/client";
import type { LoggerLike } from "./pagotic.service";

/* ---------------------------- Inputs ---------------------------- */
const CreateFromOrderInputSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).optional(),
  // Datas RFC 822 + TZ (yyyy-MM-dd'T'HH:mm:ssZ)
  dueDate: z.string().optional(),
  lastDueDate: z.string().optional(),
  presets: z
    .object({
      media_payment_ids: z.array(z.number().int()).optional(),
      type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).optional(),
      promotion_ids: z.string().optional(),
      installments: z.number().int().positive().optional(),
      actions: z.array(z.object({ retry: z.boolean().optional() })).optional(),
    })
    .optional(),
});

/* ---------------------- Domain types locais --------------------- */
type DomainOrderItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  conceptId: string;
  externalReference?: string;
};
type DomainOrder = { id: string; items: DomainOrderItem[] };
type DomainUser = {
  id: string;
  name: string;
  email: string;
  identification: { type: string; number: string; country?: string };
  phone?: {
    country_code: number;
    area_code: number;
    number: number;
    description?: string;
    extension?: number;
  };
};

/** Logger mínimo aceito no ctx */
type MinimalLogger = {
  info?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
};

/** Contexto mínimo usado pelo handler */
type StartPaymentCtx = {
  logger?: MinimalLogger;
  session: { user: { id: string } };
  prisma: PrismaClient;
};

/** Shape exato do item retornado pelo findMany com o select atual */
type PrismaOrderItemForPayment = {
  id: string;
  qty: number;
  seat: null | {
    label: string | null;
    ticketCategory: { title: string | null; price: number | null } | null;
  };
  ticketCategory: null | {
    title: string | null;
    price: number | null;
  };
};

/* --------------------------- Helpers ---------------------------- */
/** Normaliza qualquer logger p/ LoggerLike (sem `any`) */
function toStrongLogger(src?: MinimalLogger): LoggerLike {
  const base = src ?? {};
  return {
    info: (base.info ?? console.info).bind(console),
    error: (base.error ?? console.error).bind(console),
    warn: (base.warn ?? console.warn).bind(console),
    debug: (base.debug ?? console.debug).bind(console),
  };
}

/* --------------------------- Mapeadores ------------------------- */
function mapPrismaUserToDomain(user: {
  id: string;
  name: string | null;
  email: string | null;
  dni?: string | null;
  phone?: string | null;
}): DomainUser {
  const name = user.name ?? "User";
  const email = user.email ?? "user@example.com";
  const identification = {
    type: "DNI",
    number: user.dni ?? "00000000",
    country: "ARG",
  };
  const phone = user.phone
    ? {
        country_code: 54,
        area_code: 11,
        number: Number(user.phone.replace(/\D/g, "").slice(-8) || 55551234),
        description: "mobile",
      }
    : undefined;

  return { id: user.id, name, email, identification, phone };
}

/* ---------------------- Handler compartilhado ------------------- */
async function handleStartPayment(
  ctx: StartPaymentCtx,
  input: z.infer<typeof CreateFromOrderInputSchema>
): Promise<{ id: string; formUrl: string | null }> {
  const logger = toStrongLogger(ctx.logger);

  // 1) User
  const userId = ctx.session.user.id;
  const prismaUser = await ctx.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, dni: true, phone: true },
  });
  if (!prismaUser) throw new Error("User not found");
  const domainUser = mapPrismaUserToDomain(prismaUser);

  // 2) Order
  const prismaOrder = await ctx.prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      eventId: true,
      eventSessionId: true,
      status: true,
      total: true,
      createdAt: true,
    },
  });
  if (!prismaOrder) throw new Error("Order not found");

  // 3) OrderItems com relacionamentos necessários
  const prismaOrderItems = await ctx.prisma.orderItem.findMany({
    where: { orderId: input.orderId },
    select: {
      id: true,
      qty: true,
      seat: {
        select: {
          label: true,
          ticketCategory: { select: { title: true, price: true } },
        },
      },
      ticketCategory: { select: { title: true, price: true } },
    },
  });
  if (prismaOrderItems.length === 0) throw new Error("Order has no items");

  // 4) Derivação dos itens comerciais exigidos pelo PagoTIC
  const CURRENCY = (process.env.PAGOTIC_CURRENCY_ID ?? "ARS").toUpperCase();
  const CONCEPT = process.env.PAGOTIC_CONCEPT_ID_DEFAULT ?? "woocommerce";

  const mappedItems: DomainOrderItem[] = prismaOrderItems.map(
    (it: PrismaOrderItemForPayment) => {
      const isSeated = !!it.seat;
      const titleFrom =
        (isSeated ? it.seat?.ticketCategory?.title : it.ticketCategory?.title) ?? "Ingresso";
      const unitPrice =
        (isSeated ? it.seat?.ticketCategory?.price : it.ticketCategory?.price) ?? 0;
      const qty = it.qty ?? 1;

      const seatLabel = isSeated && it.seat?.label ? ` – Assento ${it.seat.label}` : "";
      const description = isSeated
        ? `${titleFrom}${seatLabel}`
        : `${titleFrom} – Quantidade ${qty}`;

      const amount = unitPrice * qty;

      return {
        id: it.id,
        title: titleFrom,
        description,
        amount,
        currency: CURRENCY,
        conceptId: CONCEPT,
        externalReference: it.id,
      };
    }
  );

  const domainOrder: DomainOrder = { id: prismaOrder.id, items: mappedItems };

  // 5) Datas (RFC 822 + TZ)
  if (input.dueDate) assertRfc822Tz(input.dueDate);
  if (input.lastDueDate) assertRfc822Tz(input.lastDueDate);

  // 6) Payload com utils
  const payload = buildCreatePayloadFromOrder(process.env, domainOrder, domainUser, {
    type: input.type ?? "online",
    dueDate: input.dueDate,
    lastDueDate: input.lastDueDate,
    presets: input.presets,
    metadata: { orderId: domainOrder.id },
  });

  // 7) Chamada ao Service (↑ timeout robusto p/ prod)
  const svc = new PagoticService(process.env, { logger, timeoutMs: 35000, retries: 1 });
  const { id, form_url } = await svc.createPayment(payload, {
    fillDefaultConcept: true,
    fillDefaultCurrency: true,
    enforceEnvUrls: true,
  });

  return { id, formUrl: form_url ?? null };
}

/* ------------------------------ Router -------------------------- */
export const pagoticRouter = router({
  createFromOrder: protectedProcedure
    .input(CreateFromOrderInputSchema)
    .mutation(async ({ ctx, input }) =>
      handleStartPayment(
        {
          logger: (ctx as unknown as StartPaymentCtx).logger,
          session: ctx.session,
          prisma: (ctx as unknown as StartPaymentCtx).prisma,
        },
        input
      )
    ),

  // alias compatível com o front atual
  startPagoTICPayment: protectedProcedure
    .input(CreateFromOrderInputSchema)
    .mutation(async ({ ctx, input }) =>
      handleStartPayment(
        {
          logger: (ctx as unknown as StartPaymentCtx).logger,
          session: ctx.session,
          prisma: (ctx as unknown as StartPaymentCtx).prisma,
        },
        input
      )
    ),

  getPaymentById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const logger = toStrongLogger((ctx as unknown as StartPaymentCtx).logger);
      const svc = new PagoticService(process.env, { logger, timeoutMs: 30000, retries: 1 });
      const payment = await svc.getPaymentById(input.id);
      return GetPaymentResponseSchema.parse(payment);
    }),
});

export type PagoticRouter = typeof pagoticRouter;
