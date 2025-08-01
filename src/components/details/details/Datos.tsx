// src/components/details/details/Datos.tsx
import React from "react";
import { IoIosArrowDown } from "react-icons/io";

interface Props {
  fecha: string;
  artist: string;
}

const Datos = ({ fecha, artist }: Props) => {
  return (
    <>
      <div className="flex justify-between font-medium lg:justify-start lg:gap-8">
        <div className="flex items-center">
          <IoIosArrowDown />
          <div className="ml-2">
            <h4 className="font-bold">{fecha}</h4>
            <h4>Dom - 19:20pm</h4>
          </div>
        </div>

        <div>
          <h4>Auditorio de Belgrano</h4>
          <h4>{artist}</h4>
        </div>
      </div>
    </>
  );
};

export default Datos;
