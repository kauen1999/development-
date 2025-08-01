// src/components/principal/eventos_hoy/HoyCard.tsx
import React from "react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { BiTimeFive } from "react-icons/bi";
import { CiLocationOn } from "react-icons/ci";

export const hoyCard = [
  {
    foto: "/images/queen.jpg",
    titulo: "Queen Tribute",
    horas: "20:00",
    fecha: "2023-10-15",
    precio: "$50",
    duracion: "2 horas",
    ubicacion: "Teatro Principal",
    ciudad: "Madrid",
    categoria: "Música",
  },
  {
    foto: "/images/dante.jpg",
    titulo: "Dante Alighieri",
    horas: "18:00",
    fecha: "2023-10-16",
    precio: "$30",
    duracion: "1.5 horas",
    ubicacion: "Sala Dante",
    ciudad: "Barcelona",
    categoria: "Teatro",
  },
  {
    foto: "/images/cuarteto.jpg",
    titulo: "Cuarteto de Cuerdas",
    horas: "19:00",
    fecha: "2023-10-17",
    precio: "$40",
    duracion: "2 horas",
    ubicacion: "Auditorio Nacional",
    ciudad: "Valencia",
    categoria: "Música",
  },
];

interface Props {
  foto: StaticImageData | string;
  titulo: string;
  horas: string;
  fecha: string;
  precio: string;
  duracion: string;
  ubicacion: string;
  ciudad: string;
  categoria: string;
}

const HoyCard = ({
  foto,
  titulo,
  horas,
  fecha,
  precio,
  duracion,
  ubicacion,
  ciudad,
}: Props) => {
  return (
    <article className="max-w-md rounded-2xl shadow-xl lg:max-w-lg">
      <div className="relative h-[200px] lg:h-[13vw]">
        <Image
          src={foto}
          alt={titulo}
          style={{
            objectFit: "cover",
            width: "100%",
            height: "100%",
          }}
          width={500}
          height={500}
          className="rounded-2xl"
        />
        <h3 className="absolute top-5 left-3 text-3xl font-bold text-white lg:text-2xl">
          {titulo}
        </h3>
        <h4 className="absolute bottom-5 left-3 font-bold text-white">
          {horas}
        </h4>
      </div>

      <div className="grid grid-cols-2 p-4 lg:text-sm">
        <div className="izq flex flex-col justify-between">
          <h4 className="my-5 text-3xl font-bold lg:text-2xl">{fecha}</h4>
          <div>
            <p className="text-primary-100">Precio del boleto</p>
            <h4 className="text-2xl font-bold text-primary-100 lg:text-xl">
              {precio}
            </h4>
          </div>
        </div>

        <div className="der flex flex-col gap-6 lg:gap-4">
          <div className="flex items-center gap-1">
            <BiTimeFive className="text-2xl text-slate-500" />
            <h5 className="font-bold">{duracion}</h5>
          </div>

          <div className="flex items-center gap-1">
            <CiLocationOn className="text-2xl text-slate-500" />
            <div>
              <h5 className="font-bold leading-none">{ubicacion}</h5>
              <h5 className="text-slate-500">{ciudad}</h5>
            </div>
          </div>

          <Link
            href={{
              pathname: "buydetails/[id]",
              query: {
                id: "01",
                foto: typeof foto === "string" ? foto : foto.src,
                titulo,
                horas,
                fecha,
                precio,
                duracion,
                ubicacion,
                ciudad,
              },
            }}
          >
            <div className="cursor-pointer rounded-lg bg-primary-100 py-2 px-5 text-center text-xl font-bold text-white lg:text-base">
              Comprar ahora
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default HoyCard;
