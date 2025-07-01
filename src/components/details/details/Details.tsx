import React from "react";
import { useRouter } from "next/router";
import Datos from "./Datos";
import Image from "next/image";


interface Props {
  artist: string;
}

const Details = ({ artist }: Props) => {
  const router = useRouter();

  const handleNavigation = (id: string, fecha: string, picture: string) => {
    router.push({
      pathname: `/buydetails/${id}`, 
      query: { artist, fecha, picture },
    });
  };

  return (
    <section className="my-10">
      <div className="mx-auto w-11/12 lg:w-3/4">
        <h2 className="text-3xl font-bold">Todos los conciertos</h2>
        <div className="mt-5 flex flex-col gap-16">
          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="27 Nov" artist={artist} />
            <button
              onClick={() => handleNavigation("concert1", "27 Nov", "/images/concert1.jpg")}
              className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
            >
              Comprar ahora
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="31 Dic" artist={artist} />
            <button
              onClick={() => handleNavigation("concert2", "31 Dic", "/images/concert2.jpg")}
              className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
            >
              Comprar ahora
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="6 Jul" artist={artist} />
            <button
              onClick={() => handleNavigation("concert3", "6 Jul", "/images/concert3.jpg")}
              className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
            >
              Comprar ahora
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="22 Ago" artist={artist} />
            <button
              onClick={() => handleNavigation("concert4", "22 Ago", "/images/concert4.jpg")}
              className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
            >
              Comprar ahora
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="21 Sept" artist={artist} />
            <button
              onClick={() => handleNavigation("concert5", "21 Sept", "/images/concert5.jpg")}
              className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
            >
              Comprar ahora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Details;