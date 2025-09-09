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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Gestión del Evento
      </h1>

      {/* Tarjeta principal */}
      <div className="space-y-6 rounded-lg bg-white p-6 shadow-md">
        {/* Encabezado */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            {event.name}
          </h2>
          <p className="text-gray-600">{event.description}</p>
        </div>

        {/* Datos del evento */}
        <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
          <p>
            <span className="font-semibold">Categoría:</span>{" "}
            {event.category?.title ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Estado:</span> {event.status}
          </p>
          <p>
            <span className="font-semibold">Fecha inicial:</span>{" "}
            {event.startDate
              ? new Date(event.startDate).toLocaleDateString()
              : "-"}
          </p>
          <p>
            <span className="font-semibold">Fecha final:</span>{" "}
            {event.endDate
              ? new Date(event.endDate).toLocaleDateString()
              : "-"}
          </p>
        </div>

        {/* Sesiones */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 text-lg">
            Sesiones
          </h3>
          {event.eventSessions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Aún no hay sesiones creadas.
            </p>
          ) : (
            <ul className="space-y-3">
              {event.eventSessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded border p-4 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <p>
                    <span className="font-semibold">Fecha:</span>{" "}
                    {new Date(s.dateTimeStart).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Lugar:</span> {s.venueName}
                  </p>
                  <p>
                    <span className="font-semibold">Tipo:</span>{" "}
                    {s.ticketingType}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 flex-wrap pt-2">
          <button
            onClick={() => handleAction("publish")}
            disabled={isUpdating || publishMutation.isLoading}
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {publishMutation.isLoading ? "Publicando…" : "Publicar"}
          </button>

          <button
            onClick={() => handleAction("pause")}
            disabled={isUpdating || pauseMutation.isLoading}
            className="rounded bg-yellow-500 px-4 py-2 font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {pauseMutation.isLoading ? "Pausando…" : "Pausar"}
          </button>

          <button
            onClick={() => handleAction("cancel")}
            disabled={isUpdating || cancelMutation.isLoading}
            className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {cancelMutation.isLoading ? "Cancelando…" : "Cancelar"}
          </button>

          <button
            onClick={() => router.push(`/event/edit/${event.id}`)}
            className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-2 font-semibold text-white transition"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Botón volver al dashboard */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition"
        >
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
}
