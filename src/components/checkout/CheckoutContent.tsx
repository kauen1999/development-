// src/components/checkout/CheckoutContent.tsx
"use client";

import React from "react";
import Image from "next/image";
import { trpc } from "@/utils/trpc";
import imgTU from "../../../public/images/PayPal.svg";

interface CheckoutContentProps {
  title: string;
  price: number;
  sector: string;
  cant: number;
  picture: string;
  orderId: string;
}

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const CheckoutContent: React.FC<CheckoutContentProps> = ({
  title,
  price,
  sector,
  cant,
  picture,
  orderId,
}) => {
  const pagoMutation = trpc.pagotic.startPagoTICPayment.useMutation();

  const handlePayment = async () => {
    if (!orderId) {
      alert("Pedido inválido.");
      return;
    }

    // Evita cliques múltiplos enquanto processa
    if (pagoMutation.isPending) return;

    try {
      const result = await pagoMutation.mutateAsync({ orderId });

      if (result?.checkoutUrl && /^https?:\/\//i.test(result.checkoutUrl)) {
        console.info("[PagoTIC] Redirecionando para checkout...");
        // Redireciona para o PagoTIC sem passar pelo router do Next.js
        window.location.href = result.checkoutUrl;
      } else {
        console.error("[PagoTIC] Checkout URL ausente ou inválida:", result);
        alert("Não foi possível iniciar o pagamento. URL inválida.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao iniciar pagamento.";
      alert(message);
      console.error("[PagoTIC] startPagoTICPayment error:", err);
    }
  };


  const isExternal = /^https?:\/\//i.test(picture);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Finalizar Compra</h1>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* RESUMO */}
          <div className="w-full md:w-1/2">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Resumo</h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-gray-700">
                <strong>Evento:</strong> {title}
              </p>
              <p className="mb-1 text-gray-700">
                <strong>Setor:</strong> {sector}
              </p>
              <p className="mb-1 text-gray-700">
                <strong>Quantidade:</strong> {cant}
              </p>
              <p className="mb-3 text-lg font-bold text-indigo-600">
                Total: {currency.format(price)}
              </p>

              <Image
                src={picture || "/banner.jpg"}
                alt="Imagem do evento"
                width={400}
                height={300}
                className="rounded-md"
                unoptimized={isExternal}
                priority
              />
            </div>
          </div>

          {/* PAGAMENTO */}
          <div className="w-full md:w-1/2">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Pagamento</h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="pagoTIC" className="flex items-center gap-4">
                <input
                  type="radio"
                  name="payment"
                  id="pagoTIC"
                  defaultChecked
                  className="form-radio h-5 w-5 text-indigo-600"
                />
                <Image src={imgTU} alt="PagoTIC" width={150} />
              </label>

              <button
                onClick={handlePayment}
                disabled={pagoMutation.isPending}
                className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {pagoMutation.isPending ? "Procesando..." : "PAGAR AHORA"}
              </button>

              {pagoMutation.isError && (
                <p className="mt-3 text-sm text-red-600">
                  {pagoMutation.error?.message ?? "Falha ao iniciar o pagamento."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutContent;
