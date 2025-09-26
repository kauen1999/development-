// src/components/principal/hero/Hero.tsx
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Autoplay } from "swiper";
import "swiper/css/autoplay";

import Card from "./Card";
import Link from "next/link";
import { trpc } from "@/utils/trpc";
import { useSearchStore } from "@/store/searchStore";

const Hero = () => {
  const { query, city } = useSearchStore();
  const { data, isLoading } = trpc.search.global.useQuery({ query, city });

  const artists = data?.artists ?? [];

  // ✅ hoje em formato Date normalizado (meia-noite)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ só pega artistas que têm pelo menos 1 sessão >= hoje
  const validArtists = artists.filter((artist) =>
    artist.appearances.some(
      (app) =>
        app.session &&
        app.session.dateTimeStart &&
        new Date(app.session.dateTimeStart).getTime() >= today.getTime()
    )
  );

  if (isLoading) {
    return (
      <section id="artistas" className="mt-5 bg-primary-100 py-5">
        <p className="text-center text-white text-lg">Cargando artistas…</p>
      </section>
    );
  }

  return (
    <section id="artistas" className="mt-5 bg-primary-100 py-5">
      <Swiper
        modules={[Autoplay]}
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        spaceBetween={12}
        slidesPerView={3}
        grabCursor={true}
        breakpoints={{
          0: { slidesPerView: 1, spaceBetween: 8 },
          640: { slidesPerView: 2, spaceBetween: 10 },
          1024: { slidesPerView: 3, spaceBetween: 12 },
        }}
        className="!px-0"
      >
        {validArtists.map((artist) => {
          // pega a 1ª sessão futura (>= hoje)
          const futureSession = artist.appearances.find(
            (app) =>
              app.session &&
              app.session.dateTimeStart &&
              new Date(app.session.dateTimeStart).getTime() >= today.getTime()
          );

          return (
            <SwiperSlide key={artist.id} className="!h-auto">
              <Link href={`/artist/${artist.slug}`}>
                <div className="h-full">
                  <Card
                    foto={artist.image || "/banner.jpg"}
                    nombre={artist.name}
                    fecha={
                      futureSession?.session
                        ? new Date(
                            futureSession.session.dateTimeStart
                          ).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Sin fecha"
                    }
                  />
                </div>
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
};

export default Hero;
