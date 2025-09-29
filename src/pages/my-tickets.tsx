/* eslint-disable @next/next/no-html-link-for-pages */
// src/pages/my-tickets.tsx
import { trpc } from "@/utils/trpc";
import Head from "next/head";
import Image from "next/image";
import { MdConfirmationNumber, MdEvent, MdAccessTime, MdLocationOn, MdCheckCircle, MdSchedule, MdDownload, MdQrCode } from "react-icons/md";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = trpc.ticket.listMyTickets.useQuery();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Mis Tickets - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <Header />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header da página */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <MdConfirmationNumber className="text-4xl text-white" />
            </div>
            <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">Mis Tickets</h1>
            <p className="text-base md:text-lg text-gray-600">
              Gestioná tus entradas y accedé a todos tus eventos
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
              <h2 className="mb-2 text-xl font-bold text-gray-700">Cargando tus tickets...</h2>
              <p className="text-gray-600">Buscando tus entradas</p>
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <MdConfirmationNumber className="text-3xl text-gray-400" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-600">No tenés tickets</h2>
              <p className="text-gray-500 mb-6">Aún no compraste entradas para ningún evento</p>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
              >
                <MdEvent className="text-xl" />
                Ver Eventos
              </a>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl">
                  {/* Header do ticket */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <MdConfirmationNumber className="text-xl text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                          {ticket.event.name}
                        </h3>
                        <p className="text-sm text-gray-500">Ticket #{ticket.id.slice(-6)}</p>
                      </div>
                    </div>
                    
                    {/* Status badge */}
                    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      ticket.usedAt 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ticket.usedAt ? (
                        <>
                          <MdCheckCircle className="text-sm" />
                          Validado
                        </>
                      ) : (
                        <>
                          <MdSchedule className="text-sm" />
                          Pendiente
                        </>
                      )}
                    </div>
                  </div>

                  {/* Informações do evento */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MdAccessTime className="text-lg text-primary-100" />
                      <span className="font-medium">Fecha:</span>
                      <span>
                        {ticket.eventSession?.dateTimeStart
                          ? new Date(ticket.eventSession.dateTimeStart).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MdLocationOn className="text-lg text-primary-100" />
                      <span className="font-medium">Lugar:</span>
                      <span className="truncate">
                        {ticket.eventSession?.venueName ?? "Por definir"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MdConfirmationNumber className="text-lg text-primary-100" />
                      <span className="font-medium">Asiento:</span>
                      <span>{ticket.seat?.labelFull ?? "General"}</span>
                    </div>
                  </div>

                  {/* QR Code preview */}
                  {ticket.qrCodeUrl && (
                    <div className="mb-4 text-center">
                      <div className="inline-block p-2 bg-gray-50 rounded-lg">
                        <Image
                          src={ticket.qrCodeUrl}
                          alt={`Código QR del ticket ${ticket.id.slice(-6)}`}
                          width={120}
                          height={120}
                          className="rounded"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Presentá este código en el acceso
                      </p>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    {ticket.pdfUrl && (
                      <a
                        href={ticket.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg"
                      >
                        <MdDownload className="text-lg" />
                        PDF
                      </a>
                    )}
                    
                    {ticket.qrCodeUrl && (
                      <button
                        onClick={() => {
                          // Aquí podrías implementar una función para mostrar el QR en pantalla completa
                          window.open(ticket.qrCodeUrl, '_blank');
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                      >
                        <MdQrCode className="text-lg" />
                        Ver QR
                      </button>
                    )}
                  </div>

                  {/* Información adicional */}
                  {ticket.usedAt && (
                    <div className="mt-4 rounded-lg bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <MdCheckCircle className="text-lg" />
                        <span className="text-sm font-medium">
                          Validado el {new Date(ticket.usedAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
