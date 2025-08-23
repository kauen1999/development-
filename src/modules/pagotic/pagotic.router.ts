// src/moduls/pagotic/pagotic.router.ts
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

const svc = new PagoticService();

// Evita `any` para ctx
function extractOrderId(ctx: unknown): string | undefined {
  if (ctx && typeof ctx === "object" && "orderId" in ctx) {
    const val = (ctx as { orderId?: unknown }).orderId;
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
}

export const pagoticRouter = router({
  // === Usado no frontend: busca formUrl/paymentId já criados ===
  startPagoTICPayment: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, userId: true, formUrl: true, paymentNumber: true, status: true },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const userId = ctx.session?.user?.id;
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
      const body = {
        ...input,
        metadata: {
          ...(input.metadata ?? {}),
          appOrderId: extractOrderId(ctx),
          appUserId: ctx.session?.user?.id ?? undefined,
        },
      };
      const resp = await svc.createPayment(body);
      return mapPayment(resp);
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
      return {
        ...resp,
        data: resp.data.map(mapPayment),
      };
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
    .mutation(async ({ input }) => {
      return svc.groupPayments({ paymentIds: input.paymentIds });
    }),

  ungroupPayments: protectedProcedure
    .input(z.object({ groupId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return svc.ungroupPayments(input.groupId);
    }),

  distributePayment: protectedProcedure
    .input(distributionInput)
    .mutation(async ({ input }) => {
      return svc.distributePayment(input);
    }),

  resendNotification: publicProcedure
    .input(getPaymentByIdInput)
    .mutation(async ({ input }) => {
      return svc.resendNotification(input.id);
    }),
});
