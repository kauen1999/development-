// src/components/buydetailsComponent/BuyHero/BuyHero.tsx
import React, { useState, useEffect } from "react";
import { AiOutlineClockCircle } from "react-icons/ai";
import Details from "./Details";
import { useRouter } from "next/router";

interface Props {
  foto: string;
  titulo: string;
  fecha: string;
  horas: string;
  ubicacion: string;
  ciudad: string;
}

const BuyHero = ({ foto, titulo, fecha, horas, ubicacion, ciudad }: Props) => {
  const [time, setTime] = useState(260); // 4 minutos e 20 segundos
  const router = useRouter();

  useEffect(() => {
    if (time === 0) {
      router.push("/");
      return;
    }

    const timer = setInterval(() => {
      setTime((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [time, router]);

  return (
    <div className="mt-5 bg-gray-50">
      <div>
        <div className="p-5 py-5">
          <div className="mb-8"></div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold md:text-5xl">Boletos</h1>
          </div>
          <div className="mb-5 text-gray-400">
            <span className="text-gray-800">Boletos</span> /{" "}
            <span className="text-gray-500">Pagar</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-5 border-t border-gray-200 bg-primary-100 p-5 lg:flex-row lg:items-center lg:justify-between 2xl:px-14">
        <Details
          img={foto}
          title={titulo}
          fecha={`${fecha} - ${horas}`}
          ubi={`${ubicacion} - ${ciudad}`}
        />

        <div className="flex w-max items-center gap-2 rounded-lg bg-white p-2 text-slate-400">
          <AiOutlineClockCircle className="text-2xl" />
          <p>
            Tiempo de reserva:{" "}
            {time > 0 ? (
              <>
                {Math.floor(time / 60)}:
                {(time % 60).toString().padStart(2, "0")} min
              </>
            ) : (
              <>Se acabo el tiempo</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyHero;
