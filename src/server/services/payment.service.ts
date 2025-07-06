import { PaymentProvider } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createStripePayment } from "./payments/stripe.service";

export async function createPayment(
  provider: PaymentProvider,
  orderId: string,
  amount: number
) {
  switch (provider) {
    case PaymentProvider.STRIPE:
      return createStripePayment(orderId, amount);

    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported payment provider: ${provider}`,
      });
  }
}
