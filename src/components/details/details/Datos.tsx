import React from "react";
import { IoIosArrowDown } from "react-icons/io";

interface Props {
  fecha: string;
}

const Datos = ({ fecha }: Props) => {
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
          <h4>Estadium Luna Park - Buenos Aires</h4>
          <h4>Duki: tour</h4>
        </div>
      </div>
    </>
  );
};

export default Datos;
