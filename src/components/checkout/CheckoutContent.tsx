// src/components/checkout/CheckoutContent.tsx
"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
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

type StartResult = { orderId: string; paymentId: string; formUrl: string | null; checkoutUrl?: string | null; status: string };

function extractCheckoutUrl(result: StartResult): string | undefined {
  const url = result.checkoutUrl ?? result.formUrl ?? undefined;
  return typeof url === "string" ? url : undefined;
}

const CheckoutContent: React.FC<CheckoutContentProps> = ({ title, price, sector, cant, picture, orderId }) => {
  const router = useRouter();
  const pagoMutation = trpc.pagotic.startPagoTICPayment.useMutation();
  const orderQuery = trpc.order.getOrder.useQuery(
    { id: orderId },
    { enabled: Boolean(orderId), refetchInterval: (data) => (data?.status === "PAID" ? false : 3000), refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (orderQuery.data?.status === "PAID") {
      router.push(`/checkout/confirmation?orderId=${orderId}`);
    }
  }, [orderQuery.data?.status, orderId, router]);

  const handlePayment = async () => {
    if (!orderId || pagoMutation.isPending) return;
    try {
      const result = await pagoMutation.mutateAsync({ orderId }) as StartResult;
      const checkoutUrl = extractCheckoutUrl(result);
      if (checkoutUrl && /^https?:\/\//i.test(checkoutUrl)) {
        window.location.href = checkoutUrl;
      } else {
        alert("No fue posible iniciar el pago. URL inválida.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar el pago.";
      alert(message);
    }
  };

  const isExternal = /^https?:\/\//i.test(picture);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Finalizar compra</h1>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="w-full md:w-1/2">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Resumen</h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-gray-700"><strong>Evento:</strong> {title}</p>
              <p className="mb-1 text-gray-700"><strong>Sector:</strong> {sector}</p>
              <p className="mb-1 text-gray-700"><strong>Cantidad:</strong> {cant}</p>
              <p className="mb-3 text-lg font-bold text-indigo-600">Total: {currency.format(price)}</p>
              <Image src={picture || "/banner.jpg"} alt="Imagen del evento" width={400} height={300} className="rounded-md" unoptimized={isExternal} priority />
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Pago</h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="pagoTIC" className="flex items-center gap-4">
                <input type="radio" name="payment" id="pagoTIC" defaultChecked className="form-radio h-5 w-5 text-indigo-600" />
                <Image src={imgTU} alt="PagoTIC" width={150} />
              </label>
              <button onClick={handlePayment} disabled={pagoMutation.isPending}
                className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                {pagoMutation.isPending ? "Procesando..." : "PAGAR AHORA"}
              </button>
              {orderQuery.isFetching && <p className="mt-3 text-sm text-gray-500">Esperando confirmación del pago…</p>}
              {pagoMutation.isError && <p className="mt-3 text-sm text-red-600">No se pudo iniciar el pago.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutContent;
