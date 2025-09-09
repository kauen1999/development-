// src/components/checkout/CheckoutContent.tsx
"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import imgBYU from "../../../public/images/byurbana.png";
import type { CheckoutLineItem } from "@/pages/checkout/[id]";

interface CheckoutContentProps {
  orderId: string;
  items: CheckoutLineItem[];
  orderTotal: number;
  pictureFallback: string;
}

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

type StartResult = {
  orderId: string;
  paymentId: string;
  formUrl: string | null;
  checkoutUrl?: string | null;
  status: string;
};

function extractCheckoutUrl(result: StartResult): string | undefined {
  const url = result.checkoutUrl ?? result.formUrl ?? undefined;
  return typeof url === "string" ? url : undefined;
}

const CheckoutContent: React.FC<CheckoutContentProps> = ({
  orderId,
  items,
  orderTotal,
  pictureFallback,
}) => {
  const router = useRouter();
  const pagoMutation = trpc.pagotic.startPagoTICPayment.useMutation();

  const orderQuery = trpc.order.getOrder.useQuery(
    { id: orderId },
    {
      enabled: Boolean(orderId),
      // ✅ Para de poll quando estiver em estado terminal
      refetchInterval: (data) =>
        data && (data.status === "PAID" || data.status === "CANCELLED" || data.status === "EXPIRED")
          ? false
          : 3000,
      // ✅ Refaz fetch ao voltar o foco (útil quando o usuário retorna do provedor de pagamento)
      refetchOnWindowFocus: true,
    }
  );

  // ✅ Redireciona por status (PAID → confirmation; CANCELLED/EXPIRED → failed)
  useEffect(() => {
    const status = orderQuery.data?.status;
    if (!status) return;

    if (status === "PAID") {
      router.push(`/checkout/confirmation?orderId=${orderId}`);
      return;
    }

    if (status === "CANCELLED" || status === "EXPIRED") {
      router.push(`/checkout/failed?orderId=${orderId}`);
    }
  }, [orderQuery.data?.status, orderId, router]);

  // ✅ Refetch extra quando a aba volta a ficar visível (além do refetchOnWindowFocus)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        orderQuery.refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [orderQuery]);

  const handlePayment = async () => {
    if (!orderId || pagoMutation.isPending) return;
    try {
      const result = (await pagoMutation.mutateAsync({ orderId })) as StartResult;

      // ✅ Guarda o paymentId localmente (útil para diagnóstico)
      try {
        if (result?.paymentId) {
          sessionStorage.setItem(`pagotic:paymentId:${orderId}`, result.paymentId);
        }
      } catch {}

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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Finalizar compra</h1>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Resumen */}
          <div className="w-full md:w-2/3">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Resumen</h2>

            <div className="space-y-4">
              {items.map((it) => {
                const imgSrc = it.picture || pictureFallback;
                const isExternal = /^https?:\/\//i.test(imgSrc);

                const dt =
                  it.sessionDateTime != null
                    ? dateFmt.format(new Date(it.sessionDateTime))
                    : "—";

                return (
                  <div key={it.id} className="rounded border border-gray-200 bg-gray-50 p-4">
                    <div className="flex gap-4">
                      <div className="h-24 w-36 overflow-hidden rounded-md bg-white">
                        <Image
                          src={imgSrc}
                          alt={it.title}
                          width={360}
                          height={240}
                          className="h-24 w-36 object-cover"
                          unoptimized={isExternal}
                        />
                      </div>

                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">{it.title}</p>
                        <p className="text-sm text-gray-600">
                          <strong>Fecha:</strong> {dt}
                          {" — "}
                          <strong>
                            {it.venueName ? it.venueName : "—"}
                            {it.city ? `, ${it.city}` : ""}
                          </strong>
                        </p>

                        <p className="text-sm text-gray-600">
                          <strong>Ingreso:</strong> {it.categoryTitle} {" — "}
                          <strong>Tipo:</strong> {it.type}
                        </p>

                        <p className="text-sm text-gray-700">
                          Qtd: {it.qty} · Unit: {currency.format(it.unitAmount)} ·{" "}
                          <strong>Subtotal: {currency.format(it.subtotal)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pago */}
          <div className="w-full md:w-1/3">
            <h2 className="mb-2 text-xl font-semibold text-gray-700">Pago</h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="pagoTIC" className="flex items-center gap-4">
                <input
                  type="radio"
                  name="payment"
                  id="pagoTIC"
                  defaultChecked
                  className="form-radio h-5 w-5 text-indigo-600"
                />
                <Image src={imgBYU} alt="BY Urbana" width={150} />
              </label>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
                <span>Total</span>
                <span className="font-bold">{currency.format(orderTotal)}</span>
              </div>

              <button
                onClick={handlePayment}
                disabled={pagoMutation.isPending}
                className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {pagoMutation.isPending ? "Procesando..." : "PAGAR AHORA"}
              </button>

              {orderQuery.isFetching && (
                <p className="mt-3 text-sm text-gray-500">Esperando confirmación del pago…</p>
              )}
              {pagoMutation.isError && (
                <p className="mt-3 text-sm text-red-600">No se pudo iniciar el pago.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutContent;
