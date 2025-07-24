import React from "react";
import Image, { StaticImageData } from "next/image";

interface Props {
  img: StaticImageData;
  title: string;
  fecha: string;
  ubi: string;
}

const Details = ({ img, title, fecha, ubi }: Props) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="relative mx-auto w-xl lg:mx-0 lg:w-[12rem]">
        <Image src={img} alt="img" fill={true} className="object-cover" />
      </div>

      <div className="flex flex-col gap-1 text-white">
        <h1 className="lg:text-5 text-4xl font-bold">{title}</h1>
        <p>{fecha}</p>
        <p>{ubi}</p>
      </div>
    </div>
  );
};

export default Details;
