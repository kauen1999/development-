// src/pages/checkout/failed.tsx
import React from "react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import Head from "next/head";
import { MdErrorOutline, MdRefresh, MdHome } from "react-icons/md";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
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

export default function PaymentFailedPage() {
  const router = useRouter();
  const { orderId } = router.query as { orderId?: string };

  const orderQuery = trpc.order.getOrder.useQuery(
    { id: orderId || "" },
    { enabled: Boolean(orderId) }
  );
  const pagoMutation = trpc.pagotic.startPagoTICPayment.useMutation();

  const handleRetry = async () => {
    if (!orderId || pagoMutation.isPending) return;
    try {
      const result = (await pagoMutation.mutateAsync({ orderId })) as StartResult;
      const checkoutUrl = extractCheckoutUrl(result);
      if (checkoutUrl && /^https?:\/\//i.test(checkoutUrl)) {
        window.location.href = checkoutUrl;
      } else {
        alert("No fue posible iniciar el pago. URL inválida.");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al reiniciar el pago.");
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Error - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-red-50 p-6 shadow-md text-center">
          <MdErrorOutline className="mx-auto mb-4 text-6xl text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">Pedido no informado.</p>
        </div>
      </div>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Cargando - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-white p-6 shadow-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
          <h1 className="mb-2 text-2xl font-bold text-gray-700">Cargando pedido…</h1>
        </div>
      </div>
    );
  }

  if (orderQuery.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Error - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-red-50 p-6 shadow-md text-center">
          <MdErrorOutline className="mx-auto mb-4 text-6xl text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">Error: {orderQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const total = Number(orderQuery.data?.total ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Head>
        <title>Pago no autorizado - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="w-full max-w-2xl">
        {/* Header da página */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <MdErrorOutline className="text-4xl text-red-500" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">Pago no autorizado</h1>
          <p className="text-base md:text-lg text-gray-600">
            Tu pago no pudo ser procesado o fue rechazado.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Enviamos un enlace a tu correo para intentar nuevamente.
          </p>
        </div>

        {/* Card com informações do pedido */}
        <div className="mb-8 rounded-xl bg-white p-4 md:p-6 shadow-lg">
          <h2 className="mb-4 text-lg md:text-xl font-semibold text-gray-900">Detalles del pedido</h2>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-100 pb-2">
              <span className="font-medium text-gray-600">Número de pedido:</span>
              <span className="font-mono text-sm text-gray-900 break-all">{orderId}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-100 pb-2">
              <span className="font-medium text-gray-600">Total:</span>
              <span className="text-lg font-bold text-primary-100">{currency.format(total)}</span>
            </div>
            {orderQuery.data?.status && (
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-medium text-gray-600">Estado:</span>
                <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 w-fit">
                  {orderQuery.data.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            disabled={pagoMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdRefresh className={`text-xl ${pagoMutation.isPending ? 'animate-spin' : ''}`} />
            {pagoMutation.isPending ? "Redirigiendo…" : "Intentar pagar ahora"}
          </button>

          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
          >
            <MdHome className="text-xl" />
            Ir al inicio
          </button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">¿Necesitas ayuda?</h3>
          <p className="text-sm text-blue-700">
            Si tienes problemas con el pago, puedes contactarnos o intentar nuevamente más tarde.
          </p>
        </div>
      </div>
    </div>
  );
}
