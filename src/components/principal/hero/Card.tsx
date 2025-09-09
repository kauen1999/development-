// src/components/principal/hero/Card.tsx
import React from "react";
import Image from "next/image";

interface Props {
  foto: string;
  nombre: string;
  fecha: string;
}

const Card = ({ foto, nombre, fecha }: Props) => {
  return (
    <article className="relative max-w-md overflow-hidden rounded-xl shadow-md">
      <div className="relative h-[280px] w-full">
        <Image
          src={foto}
          alt={`Imagen de ${nombre}`}
          fill
          priority
          className="rounded-xl object-cover object-center md:object-top"
        />
      </div>

      {/* Texto sobre a imagem */}
      <h3 className="absolute top-5 left-5 text-2xl font-bold text-white drop-shadow lg:text-xl">
        {nombre}
      </h3>

      <div className="absolute bottom-5 left-5 text-sm font-semibold text-white drop-shadow">
        {fecha}
      </div>
    </article>
  );
};

export default Card;
