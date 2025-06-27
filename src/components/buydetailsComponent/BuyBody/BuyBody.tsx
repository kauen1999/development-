import React, { useState } from "react";
import { GoSettings } from "react-icons/go";
import LunaParkMap from "../../maps/LunaParkMap";
import Asientos from "./Asientos";
import SeccionCampo from "./SeccionCampo";

const BuyBody = () => {
  const [open, setOpen] = useState(false);
  const trigger = () => {
    setOpen(!open);
  };

  return (
    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 2xl:max-w-[90%]">
      <div className="flex items-center justify-center w-full">
        <LunaParkMap />
      </div>
      <div className="p-9">
        <div className="flex justify-center gap-3">
          <select
            name="boleto"
            id="boleto"
            className="rounded-lg border-2 border-slate-400 p-2 pr-20"
          >
            <option value="1">1 Boleto</option>
            <option value="2">2 Boletos</option>
            <option value="3">3 Boletos</option>
            <option value="4">4 Boletos</option>
            <option value="5">5 Boletos</option>
          </select>

          <button className="flex items-center gap-1 rounded  border-2 border-slate-400 bg-white px-3">
            <GoSettings />
            Filtros
          </button>
        </div>

        <div className="mt-10 grid grid-cols-2 place-items-center">
          <p onClick={trigger} className="cursor-pointer">
            Menor Precio
          </p>
          <p onClick={trigger} className="cursor-pointer">
            Mejores Asientos
          </p>
        </div>

        {open ? (
          <div className="mt-5 flex flex-col gap-3 px-5">
            <SeccionCampo />
            <SeccionCampo />
            <SeccionCampo />
            <SeccionCampo />
            <SeccionCampo />
            <SeccionCampo />
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3 px-5">
            <Asientos />
            <Asientos />
            <Asientos />
            <Asientos />
            <Asientos />
            <Asientos />
            <Asientos />
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyBody;
