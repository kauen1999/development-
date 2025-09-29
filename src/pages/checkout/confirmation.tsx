// src/pages/checkout/confirmation.tsx
import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";
import { trpc } from "@/utils/trpc";
import { MdCheckCircle, MdDownload, MdHome, MdQrCode } from "react-icons/md";

// ===== Tipos utilitários (sem null/any) =====
type TicketLike = {
  id?: string;
  qrCodeUrl?: string;
  qr_code_url?: string;
  pdfUrl?: string;
  pdf_url?: string;
  createdAt?: string | Date;
  seatId?: string;
  ticketCategoryId?: string;
};

type OrderItemLike = {
  id?: string;
  title?: string;
  amount?: number;
  currency?: string;
  ticket?: TicketLike;
};

type UserLike = { email?: string };

type OrderDTOBase = {
  id: string;
  userId: string;
  eventId: string;
  eventSessionId: string;
  status: string;
  total: number;
  createdAt: Date | string;
  expiresAt?: Date | string;
  externalTransactionId?: string;
  paymentNumber?: string;
  formUrl?: string;
};

type OrderForView = OrderDTOBase & {
  user?: UserLike;
  orderItems?: OrderItemLike[];
};

function isOrderForView(x: unknown): x is OrderForView {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.status !== "string") return false;
  if (o.orderItems !== undefined && !Array.isArray(o.orderItems)) return false;
  return true;
}

function formatMoney(amount?: number, currency?: string) {
  if (typeof amount !== "number") return null;
  const code = currency || "USD";
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

  const {
    data,
    isLoading,
    error,
  } = trpc.order.getOrder.useQuery(
    { id: orderId || "" },
    { enabled: Boolean(orderId) }
  );

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Error - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-red-50 p-6 shadow-md text-center">
          <MdCheckCircle className="mx-auto mb-4 text-6xl text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">Pedido não informado.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Carregando - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-white p-6 shadow-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
          <h1 className="mb-2 text-2xl font-bold text-gray-700">Carregando pedido…</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Error - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-red-50 p-6 shadow-md text-center">
          <MdCheckCircle className="mx-auto mb-4 text-6xl text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">Erro: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!isOrderForView(data)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Head>
          <title>Error - EntradaMaster</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="max-w-md rounded-lg bg-red-50 p-6 shadow-md text-center">
          <MdCheckCircle className="mx-auto mb-4 text-6xl text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-700">Pedido não encontrado.</p>
        </div>
      </div>
    );
  }

  // A partir daqui, `data` é OrderForView pelo type guard
  const order = data;

  const ticketRows: Array<{ item: OrderItemLike; ticket: TicketLike }> =
    (order.orderItems ?? [])
      .flatMap((item) => (item?.ticket ? [{ item, ticket: item.ticket }] : []));

  const userEmail = order.user?.email;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Head>
        <title>Compra completada - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="w-full max-w-4xl">
        {/* Header da página */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <MdCheckCircle className="text-4xl text-green-500" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
            ¡Compra completada con éxito!
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            {order.status === "PAID"
              ? "Gracias por tu compra. Tu(s) entrada(s) está(n) lista(s) para usar."
              : "Estamos confirmando tu pago y generando las entradas."}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            También te hemos enviado los tickets por correo electrónico
            {userEmail ? <> a <strong>{userEmail}</strong></> : null}.
          </p>
        </div>

        {/* Cards de tickets */}
        {ticketRows.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ticketRows.map(({ item, ticket }, idx) => {
              const qr = ticket.qrCodeUrl ?? ticket.qr_code_url;
              const pdf = ticket.pdfUrl ?? ticket.pdf_url;
              const isExternal = typeof qr === "string" && /^https?:\/\//i.test(qr);
              const precio = formatMoney(item.amount, item.currency);

              return (
                <div
                  key={ticket.id ?? item.id ?? String(idx)}
                  className="rounded-xl bg-white p-4 md:p-6 shadow-lg"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <MdQrCode className="text-2xl text-primary-100" />
                    <h2 className="text-lg font-semibold text-gray-800">
                      Ticket #{ticket.id ?? idx + 1}
                    </h2>
                  </div>

                  <div className="mb-4 space-y-2 text-sm">
                    {item.title && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-600">Categoría:</span>
                        <span className="text-gray-900">{item.title}</span>
                      </div>
                    )}
                    {precio && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-600">Precio:</span>
                        <span className="font-bold text-primary-100">{precio}</span>
                      </div>
                    )}
                    {ticket.seatId && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-600">Asiento:</span>
                        <span className="text-gray-900">{ticket.seatId}</span>
                      </div>
                    )}
                    {ticket.ticketCategoryId && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-600">ID de categoría:</span>
                        <span className="font-mono text-xs text-gray-900 break-all">{ticket.ticketCategoryId}</span>
                      </div>
                    )}
                    {ticket.createdAt && (
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-gray-600">Emitido:</span>
                        <span className="text-gray-900">{new Date(ticket.createdAt).toLocaleString("es-ES")}</span>
                      </div>
                    )}
                  </div>

                  {qr ? (
                    <div className="text-center">
                      <div className="mb-4 flex justify-center">
                        <Image
                          src={qr}
                          alt={`Código QR del ticket ${idx + 1}`}
                          width={150}
                          height={150}
                          className="rounded-lg border-2 border-gray-200"
                          unoptimized={isExternal}
                        />
                      </div>
                      <p className="mb-4 text-xs text-gray-500">
                        Presenta este código QR en el acceso al evento.
                      </p>

                      {pdf && (
                        <a
                          href={pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                        >
                          <MdDownload className="text-lg" />
                          Descargar PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
                      <p className="text-sm text-gray-600">
                        Generando el código QR…
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : order.status === "PAID" ? (
          <div className="rounded-lg bg-blue-50 p-6 text-center">
            <MdCheckCircle className="mx-auto mb-2 text-3xl text-blue-500" />
            <p className="text-gray-700">
              Pago confirmado: si no ves el QR aquí, revisa tu correo — los tickets ya fueron enviados.
            </p>
          </div>
        ) : null}

        {/* Botão de ação */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
          >
            <MdHome className="text-xl" />
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
