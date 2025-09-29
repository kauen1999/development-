// src/pages/EventosHoy.tsx
import React from "react";
import { Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import Link from "next/link";
import HoyCard from "@/components/principal/eventos_hoy/HoyCard";
import { useScrollToHash } from "@/hooks/useScrollToHash";
import { trpc } from "@/utils/trpc";

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
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
          <h2 className="text-xl font-bold text-gray-700">Cargando eventos...</h2>
          <p className="text-gray-600">Buscando eventos de hoy</p>
        </div>
      ) : eventosDeHoy.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="text-3xl text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-600">No hay eventos para hoy</h2>
          <p className="text-gray-500">No se encontraron eventos programados para esta fecha</p>
        </div>
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
