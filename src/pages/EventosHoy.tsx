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

  const today = new Date().toISOString().split("T")[0] ?? "";

  const { data: eventos = [], isLoading } = trpc.event.listByDate.useQuery({
    date: today || "", 
  });

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
          {eventos.map((event) => {
            const fecha = new Date(event.date);
            const hora = fecha.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <SwiperSlide key={event.id}>
                <HoyCard
                  slug={event.slug}
                  image={event.image ?? null}
                  titulo={event.name}
                  horas={hora}
                  fecha={fecha.toLocaleDateString("es-AR")}
                  precio={`$${event.ticketCategories?.[0]?.price ?? 0}`}
                  duracion={"2 horas"}
                  ubicacion={event.venueName}
                  ciudad={event.city}
                  categoria={event.category?.title ?? "General"}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}
    </section>
  );
}
