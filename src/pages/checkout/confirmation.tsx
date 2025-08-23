// src/pages/checkout/confirmation.tsx
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { trpc } from "@/utils/trpc";

// ===== Tipos utilitários (sem any) =====
type TicketLike = {
  id?: string;
  qrCodeUrl?: string | null;
  qr_code_url?: string | null;
  pdfUrl?: string | null;
  pdf_url?: string | null;
  createdAt?: string | Date;
  seatId?: string | null;
  ticketCategoryId?: string | null;
};

type OrderItemLike = {
  id?: string;
  title?: string | null;
  amount?: number | null;
  currency?: string | null;
  ticket?: TicketLike | null;
};

type UserLike = { email?: string | null };

type OrderDTOBase = {
  id: string;
  userId: string;
  eventId: string;
  eventSessionId: string;
  status: string;
  total: number;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  externalTransactionId: string | null;
  paymentNumber: string | null;
  formUrl: string | null;
};

type OrderForView = OrderDTOBase & {
  user?: UserLike | null;
  orderItems?: OrderItemLike[];
};

function isOrderForView(x: unknown): x is OrderForView {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.status !== "string") return false;
  if (o.orderItems !== undefined && !Array.isArray(o.orderItems)) return false;
  return true;
}

function formatMoney(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number") return null;
  const code = currency ?? "USD";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${code}`;
  }
}

export default function ConfirmationPage() {
  const router = useRouter();
  const { orderId } = router.query as { orderId?: string };

  const { data, isLoading, error } = trpc.order.getOrder.useQuery(
    { id: orderId ?? "" },
    { enabled: Boolean(orderId) }
  );

  // ✅ Redirect automático após 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!orderId) return <p>Pedido no informado.</p>;
  if (isLoading) return <p>Cargando pedido…</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!isOrderForView(data)) return <p>Pedido no encontrado.</p>;

  const order: OrderForView = data as unknown as OrderForView;

  const ticketRows: Array<{ item: OrderItemLike; ticket: TicketLike }> =
    (order.orderItems ?? [])
      .map((item: OrderItemLike) =>
        item && item.ticket ? { item, ticket: item.ticket as TicketLike } : null
      )
      .filter(
        (row): row is { item: OrderItemLike; ticket: TicketLike } =>
          row !== null
      );

  const userEmail = order.user?.email ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <h1 className="mb-2 text-3xl font-bold text-[#FF5F00]">
        ¡Compra completada con éxito!
      </h1>

      <p className="mb-2 text-gray-700">
        {order.status === "PAID"
          ? "Gracias por tu compra. Tu(s) entrada(s) está(n) lista(s) para usar."
          : "Estamos confirmando tu pago y generando las entradas."}
      </p>

      <p className="mb-6 text-sm text-gray-500">
        También te hemos enviado los tickets por correo electrónico
        {userEmail ? <> a <strong>{userEmail}</strong></> : null}.
      </p>

      {ticketRows.length > 0 ? (
        ticketRows.map(({ item, ticket }, idx) => {
          const qr = ticket.qrCodeUrl ?? ticket.qr_code_url ?? "";
          const pdf = ticket.pdfUrl ?? ticket.pdf_url ?? "";
          const isExternal = /^https?:\/\//i.test(qr);
          const precio = formatMoney(item.amount ?? null, item.currency ?? null);

          return (
            <div
              key={ticket.id ?? item.id ?? idx}
              className="mb-4 w-full max-w-md rounded-lg bg-gray-100 p-6 text-left shadow-md"
            >
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Ticket #{ticket.id ?? idx + 1}
              </h2>

              <ul className="mb-4 text-sm text-gray-700">
                {item.title && (
                  <li>
                    <span className="font-medium">Categoría: </span>
                    {item.title}
                  </li>
                )}
                {precio && (
                  <li>
                    <span className="font-medium">Precio: </span>
                    {precio}
                  </li>
                )}
                {ticket.seatId && (
                  <li>
                    <span className="font-medium">Asiento: </span>
                    {ticket.seatId}
                  </li>
                )}
                {ticket.ticketCategoryId && (
                  <li>
                    <span className="font-medium">ID de categoría: </span>
                    {ticket.ticketCategoryId}
                  </li>
                )}
                {ticket.createdAt && (
                  <li>
                    <span className="font-medium">Emitido: </span>
                    {new Date(ticket.createdAt).toLocaleString("es-ES")}
                  </li>
                )}
              </ul>

              {qr ? (
                <>
                  <div className="flex justify-center">
                    <Image
                      src={qr}
                      alt={`Código QR del ticket ${idx + 1}`}
                      width={200}
                      height={200}
                      className="rounded"
                      unoptimized={isExternal}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Presenta este código QR en el acceso al evento.
                  </p>

                  {pdf && (
                    <div className="mt-4 text-center">
                      <a
                        href={pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded bg-[#FF5F00] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Descargar PDF del ticket
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600">
                  Ticket listo, generando el código QR…
                </p>
              )}
            </div>
          );
        })
      ) : order.status === "PAID" ? (
        <p className="text-gray-600">
          Pago confirmado: si no ves el QR aquí, revisa tu correo — los tickets ya fueron enviados.
        </p>
      ) : null}
    </div>
  );
}
