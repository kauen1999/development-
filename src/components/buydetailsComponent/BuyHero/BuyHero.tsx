import React from "react";
import img from "../../../../public/images/queen.jpg";
import { AiOutlineClockCircle } from "react-icons/ai";
import Details from "./Details";

const BuyHero = () => {
  return (
    <div className="mt-5 bg-primary-100 p-5 flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-center 2xl:px-14">
      <Details
        img={img}
        title="Queen: tour"
        fecha="27 Nov - Dom - 19:20pm"
        ubi="Estadium Luna Park - Buenos Aires"
      />

      <div className="bg-white text-slate-400 flex items-center gap-2 w-max p-2 rounded-lg">
        <AiOutlineClockCircle className="text-2xl" />
        <p>Tiempo de reserva: 4:02 min</p>
      </div>
    </div>
  );
};

export default BuyHero;
