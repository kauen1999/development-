// src/modules/pagotic/pagotic.router.ts
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc"; // ajuste se necessário
import { TRPCError } from "@trpc/server";
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

const svc = new PagoticService();

// Helper to safely read ctx.orderId without using `any`
function extractOrderId(ctx: unknown): string | undefined {
  if (ctx && typeof ctx === "object" && "orderId" in ctx) {
    const val = (ctx as { orderId?: unknown }).orderId;
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
}

export const pagoticRouter = router({
  createPayment: protectedProcedure
    .input(createPaymentInput)
    .mutation(async ({ input, ctx }) => {
      // Attach metadata for traceability
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
      // API requires minimum filter combos; relies on backend validation + 400 from provider if missing
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
    .input(groupPaymentsInput) // keep generic; adapt if tenant expects different body
    .mutation(async ({ input }) => {
      // If the API expects a "groupId" instead of ids array, adapt here.
      const groupId = input.paymentIds[0];
      if (!groupId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "groupId missing" });
      }
      return svc.ungroupPayments(groupId);
    }),

  distributePayment: protectedProcedure
    .input(distributionInput)
    .mutation(async ({ input }) => {
      return svc.distributePayment(input);
    }),

  resendNotification: publicProcedure
    .input(getPaymentByIdInput) // reuse 'id'
    .mutation(async ({ input }) => {
      return svc.resendNotification(input.id);
    }),
});
