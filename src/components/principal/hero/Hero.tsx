import React from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Autoplay } from "swiper"; 
import "swiper/css/autoplay"; 


import Card from "./Card";
import duki from "../../../../public/images/duki.jpg";
import chayanne from "../../../../public/images/chayanne.jpg";
import trueno from "../../../../public/images/trueno.jpg";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="mt-5 bg-primary-100 py-5">
      <Swiper
        modules={[Autoplay]} 
        autoplay={{
          delay: 2500, 
          disableOnInteraction: false, 
        }}
        spaceBetween={10}
        slidesPerView={1.2}
        breakpoints={{
          768: {
            slidesPerView: 1.5,
          },

          1024: {
            slidesPerView: 2.2,
          },
        }}
      >
        <SwiperSlide> {/* CARD 1 */}
          <Link
            href={{
              pathname: "eventdetail/[id]",
              query: {
                id: "01",
                picture: duki.src,
                artist: "Jóse En Vivo",
                date: "14 de Mayo",
              },
            }}
          >
            <div className="ml-2">
              <Card foto={duki} nombre="Jóse En Vivo" fecha="14 de Mayo" />
            </div>
          </Link>
        </SwiperSlide>

        <SwiperSlide> {/* CARD 2 */}
          <Link
            href={{
              pathname: "eventdetail/[id]",
              query: {
                id: "01",
                picture: chayanne.src,
                artist: "Juan Lucas Martin",
                date: "01 de Abril",
              },
            }}
          >
            <Card
              foto={chayanne}
              nombre="Juan Lucas Martin"
              fecha="01 de Abril"
            />
          </Link>
        </SwiperSlide>

        <SwiperSlide> {/* CARD 3 */}
          <Link
            href={{
              pathname: "eventdetail/[id]",
              query: {
                id: "01",
                picture: trueno.src,
                artist: "Chris Andrade En Vivo",
                date: "14 de Abril",
              },
            }}
          >
            <Card
              foto={trueno}
              nombre="Chris Andrade En Vivo"
              fecha="14 de Abril"
            />
          </Link>
        </SwiperSlide>

        <SwiperSlide> {/* CARD 4 */}
          <Link
            href={{
              pathname: "eventdetail/[id]",
              query: {
                id: "01",
                picture: chayanne.src,
                artist: "Juan Lucas Martin",
                date: "01 de Abril",
              },
            }}
          >
            <Card
              foto={chayanne}
              nombre="Juan Lucas Martin"
              fecha="01 de Abril"
            />
          </Link>
        </SwiperSlide>

        <SwiperSlide> {/* CARD 5 */}
          <Link
            href={{
              pathname: "eventdetail/[id]",
              query: {
                id: "01",
                picture: duki.src,
                artist: "Jóse En Vivo",
                date: "14 de Mayo",
              },
            }}
          >
            <div className="ml-2">
              <Card foto={duki} nombre="Jóse En Vivo" fecha="14 de Mayo" />
            </div>
          </Link>
        </SwiperSlide>

      </Swiper>
    </section>
  );
};

export default Hero;
