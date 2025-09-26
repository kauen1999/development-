// src/pages/EventosHoy.tsx
import React from "react";
import { Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import Link from "next/link";
import HoyCard from "@/components/principal/eventos_hoy/HoyCard";
import { useScrollToHash } from "@/hooks/useScrollToHash";
import { trpc } from "@/utils/trpc";
import Spinner from "@/components/principal/loader/Spinner";

import "swiper/css";
import "swiper/css/pagination";

export default function EventosHoy() {
  useScrollToHash();

  // ✅ sempre string YYYY-MM-DD
  const [todayRaw] = new Date().toISOString().split("T");
  const today: string = todayRaw ?? "";

  const { data: eventos = [], isLoading } = trpc.event.listByDate.useQuery({
    date: today,
  });

  // 🔎 filtra sessions do dia atual
  const eventosDeHoy = eventos
    .map((event) => {
      const todaySessions = event.eventSessions.filter((s) => {
        if (!s.dateTimeStart) return false;
        const sessionDate = new Date(s.dateTimeStart).toISOString().split("T")[0];
        return sessionDate === today;
      });
      return todaySessions.length > 0
        ? { ...event, eventSessions: todaySessions }
        : null;
    })
    .filter((ev): ev is NonNullable<typeof ev> => ev !== null);

  return (
    <section id="eventos-hoy" className="mx-auto mt-10 w-11/12">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos para hoy</h3>
        <Link href="/">
          <div className="cursor-pointer text-lg font-bold text-primary-100 lg:text-base">
            Ver todos
          </div>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
          <span className="ml-3 text-lg font-bold text-primary-100">
            Cargando eventos...
          </span>
        </div>
      ) : eventosDeHoy.length === 0 ? (
        <p className="text-gray-500 text-center">No hay eventos para hoy.</p>
      ) : (
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
        >
          {eventosDeHoy.map((event) => (
            <SwiperSlide key={event.id}>
              <HoyCard event={event} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
