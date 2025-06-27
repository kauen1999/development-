import React from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

import Card from "./Card";
import duki from "../../../../public/images/duki.png";
import chayanne from "../../../../public/images/chayanne.png";
import trueno from "../../../../public/images/trueno.png";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="bg-primary-100 mt-5 py-5">
      <Swiper
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
        onSlideChange={() => console.log("slide change")}
        onSwiper={(swiper) => console.log(swiper)}
      >
        <SwiperSlide>
          <Link href={"/eventdetail"}>
            <div className="bg-rose-300 ml-2 rounded-lg cursor-pointer">
              <Card foto={duki} nombre="Duki" fecha="16 de Noviembre" />
            </div>
          </Link>
        </SwiperSlide>

        <SwiperSlide>
          <div className="bg-sky-300  rounded-lg">
            <Card foto={chayanne} nombre="Chayanne" fecha="6 de Diciembre" />
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div className="bg-green-400  rounded-lg">
            <Card foto={trueno} nombre="Trueno" fecha="5 de Enero" />
          </div>
        </SwiperSlide>
      </Swiper>
    </section>
  );
};

export default Hero;
