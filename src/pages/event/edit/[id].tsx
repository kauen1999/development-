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

  // Mapeia TRPC -> shape do EventForm
  const formEvent = useMemo(() => {
    if (!event) return undefined;

    const sessions = (event.eventSessions ?? []).map((s) => ({
      id: s.id, // ✅ preservar id
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
        id: c.id,             // (se quiser também preservar ids de categorias)
        title: c.title,
        price: c.price,
        capacity: c.capacity ?? 0,
      })),
      artists: (s.artists ?? []).map((a) => ({
        artist: {
          name: a.artist?.name ?? "",
          image: a.artist?.image ?? undefined,
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

  // Logs
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.group("[DEBUG] EditEventPage data");
    if (!event) {
    } else {
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

  if (!id) return <div className="p-6">Carregando…</div>;
  if (isLoading) return <div className="p-6">Carregando dados para edição…</div>;
  if (error) {
    return (
      <div className="p-6 text-red-600">
        Erro: {error.message}
        <button onClick={() => refetch()} className="ml-3 underline">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (!formEvent) return <div className="p-6">Evento não encontrado</div>;

  return (
    <EventForm
      key={`${formEvent.id}:${formEvent.sessions?.length ?? 0}`}
      mode="edit"
      event={formEvent}
      onSuccess={(eventId) => router.replace(`/event/manage/${eventId}`)}
    />
  );
}
