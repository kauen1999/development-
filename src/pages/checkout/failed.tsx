// src/pages/checkout/failed.tsx
import React from "react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";

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

  if (!orderId) return <p>Pedido no informado.</p>;
  if (orderQuery.isLoading) return <p>Cargando pedido…</p>;
  if (orderQuery.error) return <p>Error: {orderQuery.error.message}</p>;

  const total = Number(orderQuery.data?.total ?? 0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="mb-2 text-3xl font-bold text-red-600">Pago no autorizado</h1>

      <p className="mb-2 text-gray-700">
        Tu pago no pudo ser procesado o fue rechazado.
      </p>

      <p className="mb-6 text-sm text-gray-500">
        Enviamos un enlace a tu correo para intentar nuevamente.
      </p>

      <div className="mb-6 w-full max-w-md rounded-lg bg-gray-100 p-6 text-left shadow-md">
        <p className="text-gray-700">
          <span className="font-medium">Pedido:</span> {orderId}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Total:</span> {currency.format(total)}
        </p>
        {orderQuery.data?.status ? (
          <p className="text-gray-700">
            <span className="font-medium">Estado:</span> {orderQuery.data.status}
          </p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          disabled={pagoMutation.isPending}
          className="rounded bg-[#4F46E5] px-5 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pagoMutation.isPending ? "Redirigiendo…" : "Intentar pagar ahora"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="rounded border border-gray-300 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
