// src/pages/checkout/ConfirmationPage.tsx
import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { trpc } from "@/utils/trpc";

export default function ConfirmationPage() {
  const router = useRouter();
  const { orderId } = router.query as { orderId: string };

  const { data: order, isLoading, error } = trpc.order.getOrderById.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  if (isLoading) return <p>Carregando pedido...</p>;
  if (error) return <p>Erro: {error.message}</p>;
  if (!order) return <p>Pedido não encontrado.</p>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="mb-2 text-3xl font-bold text-[#FF5F00]">
        Compra Concluída com Sucesso!
      </h1>
      <p className="mb-6 text-gray-600">
        Obrigado por sua compra. Seu ingresso está pronto para ser usado.
      </p>

      {order.orderItems.map((item, idx) => (
        <div key={idx} className="w-full max-w-md rounded-lg bg-gray-100 p-6 shadow-md mb-4">
          {item.ticket?.qrCodeUrl && (
            <>
              <Image
                src={item.ticket.qrCodeUrl}
                alt={`QR Code ingresso ${idx + 1}`}
                width={200}
                height={200}
                className="mx-auto"
              />
              <p className="mt-2 text-sm text-gray-500">
                Escaneie este QR Code na entrada do evento
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
