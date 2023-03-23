import React from "react";
import { Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import Link from "next/link";
import HoyCard from "./HoyCard";

import "swiper/css";
import "swiper/css/pagination";

import queen from "../../../../public/images/queen.jpg";
import dante from "../../../../public/images/dante.jpg";
import cuarteto from "../../../../public/images/cuarteto.jpg";

const EventosHoy = () => {
  return (
    <section className="mx-auto mt-10 w-11/12">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos para hoy</h3>
        <Link href="/">
          <div className="cursor-pointer text-lg font-bold text-primary-100 lg:text-base">
            Ver todos
          </div>
        </Link>
      </div>

      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          768: {
            slidesPerView: 2,
          },

          1024: {
            slidesPerView: 3,
          },
        }}
      >
        <SwiperSlide>
          <HoyCard
            foto={queen}
            titulo="Queen"
            horas="Dentro de 5:21 horas"
            fecha="12 Oct"
            precio="7.000$"
            duracion="19:20 hasta 21:30 "
            ubicacion="Auditorio de Belgrano"
            ciudad="Buenos Aires"
          />
        </SwiperSlide>

        <SwiperSlide>
          <HoyCard
            foto={dante}
            titulo="Dante Gebel"
            horas="Dentro de 5:21 horas"
            fecha="13 Oct"
            precio="7.000$"
            duracion="19:20 hasta 22:00 "
            ubicacion="Auditorio de Belgrano"
            ciudad="Buenos Aires"
          />
        </SwiperSlide>

        <SwiperSlide>
          <HoyCard
            foto={cuarteto}
            titulo="Cuarteto de nos"
            horas="Dentro de 8:05 horas"
            fecha="02 Dic"
            precio="7.000$"
            duracion="15:20 hasta 21:30 "
            ubicacion="Auditorio de Belgrano"
            ciudad="Buenos Aires"
          />
        </SwiperSlide>

        <SwiperSlide>
          <HoyCard
            foto={dante}
            titulo="Dante Gebel"
            horas="Dentro de 5:21 horas"
            fecha="13 Oct"
            precio="7.000$"
            duracion="19:20 hasta 22:00 "
            ubicacion="Auditorio de Belgrano"
            ciudad="Buenos Aires"
          />
        </SwiperSlide>
      </Swiper>
    </section>
  );
};

export default EventosHoy;
