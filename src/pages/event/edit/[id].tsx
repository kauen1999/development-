import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import EventForm from "@/components/forms/EventForm";
import { useEffect, useMemo } from "react";

export default function EditEventPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;

  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = trpc.event.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id }
  );

  // Mapeia TRPC -> shape do EventForm (EditableEvent)
  const formEvent = useMemo(() => {
    if (!event) return undefined;

    const sessions = (event.eventSessions ?? []).map((s) => ({
      id: s.id,
      dateTimeStart: s.dateTimeStart,
      durationMin: s.durationMin,
      timezone: s.timezone,
      venueName: s.venueName,
      street: s.street,
      number: s.number,
      neighborhood: s.neighborhood,
      city: s.city,
      state: s.state,
      zip: s.zip,
      ticketingType: s.ticketingType,
      ticketCategories: (s.ticketCategories ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
        capacity: c.capacity ?? 0,
      })),
      // ✅ alinhar ao tipo que o EventForm espera
      artists: (s.artists ?? []).map((a) => ({
        artist: {
          name: a.artist?.name ?? "",
          image: a.artist?.image ?? null,
        },
      })),
    }));

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      image: event.image,
      startDate: event.startDate,
      endDate: event.endDate,
      categoryId: event.category?.id ?? event.categoryId,
      sessions,
    };
  }, [event]);

  // Logs de debug
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.group("[DEBUG] EditEventPage data");
    if (event) {
      (event.eventSessions ?? []).forEach((s, i) => {
        console.log(`[Session ${i + 1}]`, {
          id: s.id,
          venueName: s.venueName,
          ticketCategories: s.ticketCategories,
          artists: s.artists,
        });
      });
    }
    console.groupEnd();
  }, [event, formEvent]);

  if (!id) return (
    <div className="flex h-[100vh] w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
        <h1 className="text-2xl font-bold text-gray-700">Cargando…</h1>
      </div>
    </div>
  );
  
  if (isLoading) return (
    <div className="flex h-[100vh] w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
        <h1 className="text-2xl font-bold text-gray-700">Cargando datos para edición…</h1>
      </div>
    </div>
  );
  
  if (error) {
    return (
      <div className="flex h-[100vh] w-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="text-2xl text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => refetch()} 
            className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }
  
  if (!formEvent) return (
    <div className="flex h-[100vh] w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg className="text-2xl text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-700">Evento no encontrado</h1>
        <p className="text-gray-600">El evento que buscás no existe o fue eliminado</p>
      </div>
    </div>
  );

  return (
    <EventForm
      key={`${formEvent.id}:${formEvent.sessions?.length ?? 0}`}
      mode="edit"
      event={formEvent}
      onSuccess={(eventId) => router.replace(`/event/manage/${eventId}`)}
    />
  );
}
