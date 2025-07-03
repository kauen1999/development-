import createStripePayment from "./payments/stripe.service";

export async function createPayment(
  provider: "STRIPE",
  orderId: string,
  amount: number
) {
  switch (provider) {
    case "STRIPE":
      return createStripePayment(orderId, amount);
    default:
      throw new Error("Provedor de pagamento não suportado.");
  }
}
