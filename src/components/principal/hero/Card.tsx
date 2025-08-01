// src/components/principal/hero/Card.tsx
import React from "react";
import Image, { StaticImageData } from "next/image";

interface Props {
  foto: StaticImageData;
  nombre: string;
  fecha: string;
}

const Card = ({ foto, nombre, fecha }: Props) => {
  return (
    <article
      className="relative h-[28rem] rounded-lg bg-black lg:h-[20rem] 2xl:h-[27rem] bg-center"
      style={{
        backgroundImage: `url("${foto.src}")`,
      }}
    >
      <div className="p-5">
        <h2 className="text-4xl font-bold text-white lg:text-5xl">{nombre}</h2>
        <h3 className="mt-3 text-white lg:mt-2 lg:text-2xl">{fecha}</h3>
        <h3 className="text-white lg:text-2xl">Auditorio de Belgrano</h3>
      </div>
    </article>
  );
};

export default Card;
