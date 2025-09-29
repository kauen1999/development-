// src/pages/event/manage/[id].tsx
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function ManageEventPage() {
  const router = useRouter();
  const { id } = router.query;
  useSession();

  const eventId = typeof id === "string" ? id : undefined;

  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = trpc.event.getById.useQuery(
    { id: eventId as string },
    { enabled: !!eventId }
  );

  const publishMutation = trpc.event.publish.useMutation();
  const pauseMutation = trpc.event.pause.useMutation();
  const cancelMutation = trpc.event.cancel.useMutation();

  const [isUpdating, setIsUpdating] = useState(false);

  if (!eventId) return <p className="p-6">Cargando…</p>;
  if (isLoading) return <p className="p-6">Cargando evento…</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error.message}</p>;
  if (!event) return <p className="p-6">Evento no encontrado</p>;

  async function handleAction(action: "publish" | "pause" | "cancel") {
    if (!eventId) return;
    setIsUpdating(true);
    try {
      if (action === "publish") {
        await publishMutation.mutateAsync({ id: eventId });
      } else if (action === "pause") {
        await pauseMutation.mutateAsync({ id: eventId });
      } else if (action === "cancel") {
        await cancelMutation.mutateAsync({ id: eventId });
      }
      await refetch();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Error al ejecutar la acción: ${action}`
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header da página */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <svg className="text-4xl text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
            Gestión del Evento
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Administrá tu evento y seguí el rendimiento
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="rounded-xl bg-white p-6 md:p-8 shadow-lg">
          {/* Encabezado del evento */}
          <div className="mb-8">
            <h2 className="mb-4 text-2xl md:text-3xl font-bold text-gray-900">
              {event.name}
            </h2>
            <p className="text-base md:text-lg text-gray-600">{event.description}</p>
          </div>

          {/* Datos del evento */}
          <div className="mb-8 rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Información del Evento</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-primary-100"></div>
                  <span className="text-sm font-medium text-gray-600">Categoría</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{event.category?.title ?? "-"}</p>
              </div>
              
              <div className="rounded-lg bg-white p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-600">Estado</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{event.status}</p>
              </div>
              
              <div className="rounded-lg bg-white p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-600">Fecha Inicial</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {event.startDate
                    ? new Date(event.startDate).toLocaleDateString("es-AR")
                    : "-"}
                </p>
              </div>
              
              <div className="rounded-lg bg-white p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-gray-600">Fecha Final</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {event.endDate
                    ? new Date(event.endDate).toLocaleDateString("es-AR")
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Sesiones */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Sesiones del Evento</h3>
            {event.eventSessions.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <svg className="text-2xl text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-yellow-800 font-medium">Aún no hay sesiones creadas</p>
                <p className="text-yellow-700 text-sm">Agregá sesiones para que tu evento esté completo</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {event.eventSessions.map((s, index) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-gray-100 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800">Sesión {index + 1}</h4>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-primary-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-gray-600">Fecha:</span>
                        <span className="text-gray-900">{new Date(s.dateTimeStart).toLocaleString("es-AR")}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-primary-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium text-gray-600">Lugar:</span>
                        <span className="text-gray-900">{s.venueName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-primary-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="font-medium text-gray-600">Tipo:</span>
                        <span className="text-gray-900">{s.ticketingType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => handleAction("publish")}
              disabled={isUpdating || publishMutation.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishMutation.isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Publicando…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Publicar
                </>
              )}
            </button>

            <button
              onClick={() => handleAction("pause")}
              disabled={isUpdating || pauseMutation.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-white transition-all hover:bg-yellow-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pauseMutation.isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Pausando…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pausar
                </>
              )}
            </button>

            <button
              onClick={() => handleAction("cancel")}
              disabled={isUpdating || cancelMutation.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelMutation.isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Cancelando…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </>
              )}
            </button>

            <button
              onClick={() => router.push(`/event/edit/${event.id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>
        </div>

        {/* Botón volver al dashboard */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-700 hover:shadow-lg"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
