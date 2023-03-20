import React from "react";
import Image, { StaticImageData } from "next/image";

interface Props {
  foto: StaticImageData,
  nombre: string,
  fecha: string
}

const Card = ({ foto, nombre, fecha }: Props) => {
  return (
    <article className="relative h-[28rem] lg:h-[20rem] 2xl:h-[27rem]">
      <div className="p-5">
        <h2 className="text-white font-bold text-4xl lg:text-5xl">{nombre}</h2>
        <h3 className="text-white mt-3 lg:mt-2 lg:text-2xl">{fecha}</h3>
        <h3 className="text-white lg:text-2xl">Auditorio de Belgrano</h3>
      </div>

      <div className="absolute -bottom-5 left-[50%] w-[16.5rem] translate-x-[-50%] lg:left-auto lg:right-5 lg:translate-x-0 lg:w-[14rem] 2xl:w-[21rem] 2xl:right-20">
        <Image
          src={foto}
          alt="Foto"
          objectFit="cover"
        />
      </div>
    </article>
  );
};

export default Card;
