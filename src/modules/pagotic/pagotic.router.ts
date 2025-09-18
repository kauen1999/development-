// src/modules/pagotic/pagotic.router.ts
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cancelPaymentInput,
  createPaymentInput,
  distributionInput,
  getPaymentByIdInput,
  groupPaymentsInput,
  listPaymentsInput,
  refundInput,
} from "./pagotic.schema";
import { PagoticService } from "./pagotic.service";
import { mapPayment } from "./pagotic.mappers";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest } from "next";

const svc = new PagoticService();

// ------------------------
// Helpers
// ------------------------
function isPublicHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    const isHttp = u.protocol === "http:" || u.protocol === "https:";
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".local");
    return isHttp && !isLocal;
  } catch {
    return false;
  }
}

function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

function extractOrderId(ctx: unknown): string | undefined {
  if (ctx && typeof ctx === "object" && "orderId" in ctx) {
    const val = (ctx as { orderId?: string }).orderId;
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
}

// ------------------------
// Router
// ------------------------
export const pagoticRouter = router({
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          userId: true,
          formUrl: true,
          paymentNumber: true,
          status: true,
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const userId = ctx.session?.user?.id ?? null;
      if (userId && order.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
      }

      if (!order.paymentNumber || !order.formUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Order has no payment prepared. Create order first.",
        });
      }

      return {
        orderId: order.id,
        paymentId: order.paymentNumber,
        formUrl: order.formUrl,
        checkoutUrl: order.formUrl,
        status: order.status,
      };
    }),

  createPayment: protectedProcedure
    .input(createPaymentInput)
    .mutation(async ({ input, ctx }) => {
      // 1) Deriva orderId
      const orderIdFromCtx = extractOrderId(ctx);
      const orderIdFromMeta =
        typeof input.metadata?.appOrderId === "string" && input.metadata.appOrderId
          ? input.metadata.appOrderId
          : undefined;
      const orderIdFromExt =
        input.external_transaction_id?.toLowerCase().startsWith("order_")
          ? input.external_transaction_id.slice(6)
          : undefined;

      const orderId = orderIdFromCtx ?? orderIdFromMeta ?? orderIdFromExt;
      if (!orderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing order id to build external_transaction_id",
        });
      }

      // 2) Idempotência — se já existe payment pendente
      const existing = await prisma.order.findUnique({
        where: { id: orderId },
        select: { paymentNumber: true, formUrl: true, status: true },
      });

      if (existing?.paymentNumber && existing.formUrl && existing.status === "PENDING") {
        return {
          id: existing.paymentNumber,
          status: existing.status,
          finalAmount: 0,
          formUrl: existing.formUrl,
          paidAt: null,
          requestDate: null,
          details: [],
          raw: {},
          reused: true,
        };
      }

      // Se já havia pagamento mas status != PENDING → tenta cancelar
      if (existing?.paymentNumber && existing.status !== "PENDING") {
        try {
          await svc.cancelPayment(existing.paymentNumber, "Superseded by new attempt");
        } catch (e) {
          console.warn(
            "[PagoTIC][router.createPayment] cancel previous payment failed:",
            e instanceof Error ? e.message : String(e),
          );
        }
      }

      // 3) Monta payer
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });
      if (!order || !order.user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order or User not found" });
      }

      const payer = {
        name: order.user.name ?? undefined,
        email: order.user.email ?? undefined,
        identification: order.user.dni
          ? { type: "DNI", number: order.user.dni, country: "ARG" }
          : undefined,
        phones: order.user.phone
          ? [
              {
                description: "mobile",
                number: Number(order.user.phone.replace(/\D/g, "")) || undefined,
              },
            ]
          : undefined,
      };

      // 4) Enriquecer métodos de pagamento
      const payment_methods = input.payment_methods?.map((pm) => ({
        ...pm,
        holder: {
          name: order.user?.name ?? undefined,
          identification: payer.identification,
        },
      }));

      // 5) IP address (antifraude)
      const req = (ctx as { req?: NextApiRequest }).req;
      const ipAddress = req?.headers?.["x-forwarded-for"] as string | undefined;

      // 6) external_transaction_id único por tentativa
      const externalId = `order_${orderId}_${Date.now()}`;

      // 7) Corpo final
      const cleaned = {
        ...input,
        external_transaction_id: externalId,
        return_url: normalizeInputUrl(input.return_url),
        back_url: normalizeInputUrl(input.back_url),
        notification_url: normalizeInputUrl(input.notification_url),
        payer,
        payment_methods,
        metadata: {
          ...(input.metadata ?? {}),
          appOrderId: orderId,
          appUserId: ctx.session?.user?.id ?? undefined,
          ipAddress,
        },
      };

      const resp = await svc.createPayment(cleaned);
      const mapped = mapPayment(resp);

      // 8) Espelha na Order
      await prisma.order
        .update({
          where: { id: orderId },
          data: {
            paymentNumber: mapped.id,
            formUrl: mapped.formUrl ?? null,
            externalTransactionId: externalId,
          },
        })
        .catch((e: unknown) => {
          console.error(
            "[PagoTIC][router.createPayment] Persist error:",
            e instanceof Error ? e.message : String(e),
          );
        });

      return { ...mapped, reused: false };
    }),

  getPaymentById: protectedProcedure
    .input(getPaymentByIdInput)
    .query(async ({ input }) => {
      const resp = await svc.getPaymentById(input.id);
      return mapPayment(resp);
    }),

  listPayments: protectedProcedure
    .input(listPaymentsInput)
    .query(async ({ input }) => {
      const resp = await svc.listPayments({
        page: input.page,
        limit: input.limit,
        filters: input.filters,
        sorts: input.sorts,
      });
      return { ...resp, data: resp.data.map(mapPayment) };
    }),

  cancelPayment: protectedProcedure
    .input(cancelPaymentInput)
    .mutation(async ({ input }) => {
      const resp = await svc.cancelPayment(input.id, input.status_detail);
      return mapPayment(resp);
    }),

  refundPayment: protectedProcedure
    .input(refundInput)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      return svc.refundPayment(id, rest);
    }),

  groupPayments: protectedProcedure
    .input(groupPaymentsInput)
    .mutation(async ({ input }) => svc.groupPayments({ paymentIds: input.paymentIds })),

  ungroupPayments: protectedProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .mutation(async ({ input }) => svc.ungroupPayments(input.groupId)),

  distributePayment: protectedProcedure
    .input(distributionInput)
    .mutation(async ({ input }) => svc.distributePayment(input)),

  resendNotification: publicProcedure
    .input(getPaymentByIdInput)
    .mutation(async ({ input }) => svc.resendNotification(input.id)),
});
