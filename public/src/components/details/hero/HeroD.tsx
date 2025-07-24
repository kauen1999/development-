import React from "react";
import Header from "../../principal/header/Header";
import Image, { StaticImageData } from "next/image";
import duki from "../../../../public/images/duki.png";
import { BiTimeFive } from "react-icons/bi";
import { CiLocationOn } from "react-icons/ci";
import Link from "next/link";
import { MdExpandMore } from "react-icons/md";

interface Props {
  picture: StaticImageData;
  artist: string;
  date: string;
}

const HeroD = ({ picture, artist, date }: Props) => {
  return (
    <section
      className="hero h-[100vh] bg-center bg-no-repeat object-cover"
      style={{
        backgroundImage: `url("${picture}")`,
      }}
    >
      <div className="relative hero-overlay bg-black bg-opacity-50">
        <div className=" text-white">
          <Header />
        </div>
        <div className="h-[8vh]"></div>
        <div className="mx-auto mt-7 flex w-11/12 flex-col items-center gap-7 lg:flex-row lg:justify-evenly lg:gap-0">
          <div className="flex flex-col gap-7 lg:justify-center">
            <div className="titles flex flex-col items-center text-white lg:items-start">
              <h1 className="text-5xl font-bold lg:text-7xl">{artist}</h1>
              <p className="text-3xl">{date}</p>
              <p className="text-slate-300 lg:max-w-lg">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Provident eaque accusamus vitae hic praesentium quis dolorem nam
                quo quaerat repudiandae ratione aut atque sed fuga mollitia
                voluptas omnis, sit minus.
              </p>
            </div>

            <div className="datos flex flex-col gap-2 text-white">
              <div className="flex items-center gap-2">
                <BiTimeFive className="text-3xl" />
                <h4 className="text-lg">19:20 hasta 21:30</h4>
              </div>

              <div className="flex items-center gap-2">
                <CiLocationOn className="text-3xl" />
                <div>
                  <h4 className="text-lg">Auditorio de Belgrano</h4>
                  <h4 className="text-lg">Buenos Aires</h4>
                </div>
              </div>
            </div>

            <div className="mx-auto w-fit rounded-lg bg-primary-100 px-5 py-3 text-xl font-bold text-white lg:mx-0">
              <Link
                href={{
                  pathname: "../buydetails/[id].tsx",
                  query: {
                    id: "01",
                    foto: picture,
                    titulo: artist,
                    horas: null,
                    fecha: date,
                    precio: null,
                    duracion: null,
                    ubicacion: null,
                    ciudad: null,
                  },
                }}
              >
                <button>Comprar Ahora</button>
              </Link>
            </div>
          </div>

          <div className="w-full max-w-md text-center lg:w-[37rem] lg:max-w-none 2xl:w-[50rem]"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <div className="flex flex-col items-center">
            <h5 className="text-2xl text-white">Ver mas informacion</h5>
            <div className="text-white">
              <MdExpandMore size={24} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroD;
