import React, { useState } from "react";
import { GoSettings } from "react-icons/go";
import BelgranoMap from "../../maps/BelgranoMap";
import LunaParkMap from "../../maps/LunaParkMap";
import Asientos from "./Asientos";
import SeccionCampo from "./SeccionCampo";

const BuyBody = () => {
  const [open, setOpen] = useState(false);
  const [cant, setCant] = useState("1");
  const trigger = () => {
    setOpen(!open);
  };

  return (
    <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 2xl:max-w-[90%]">
      <div className="flex w-full items-center justify-center">
        <BelgranoMap />
        <div className="divider lg:divider-horizontal"></div>
      </div>
      <div className="m-auto w-[70%] py-9">
        <div className="flex justify-center gap-3">
          <select
            name="boleto"
            id="boleto"
            className="rounded-lg border-2 border-slate-400 p-2 pr-20"
            value={`${cant}`}
            onChange={(e) => {
              setCant(e.target.value);
            }}
          >
            <option value={"1"}>1 Boleto</option>
            <option value={"2"}>2 Boletos</option>
            <option value={"3"}>3 Boletos</option>
            <option value={"4"}>4 Boletos</option>
            <option value={"5"}>5 Boletos</option>
          </select>

          <button className="flex items-center gap-1 rounded  border-2 border-slate-400 bg-white px-3">
            <GoSettings />
            Filtros
          </button>
        </div>

        <div className="mt-10 flex place-content-between place-items-center">
          <p className="cursor-pointer text-xl">Sector</p>
          <p className="cursor-pointer text-xl">Precio</p>
        </div>
        <div className="mt-5 flex flex-col ">
          <SeccionCampo
            seccion={"Platea A"}
            precio={15000}
            butacas={"Butacas"}
            cant={cant}
          />
          <SeccionCampo
            seccion={"Platea B"}
            precio={12000}
            butacas={"Butacas"}
            cant={cant}
          />
          <SeccionCampo
            seccion={"Platea C"}
            precio={10000}
            butacas={"Butacas"}
            cant={cant}
          />
          <SeccionCampo
            seccion={"Pullman"}
            precio={7000}
            butacas={"Butacas"}
            cant={cant}
          />
        </div>
        <div className="mt-9 flex items-center justify-center">
          <button className="btn-warning btn">CONFIRMAR</button>
        </div>
      </div>
    </div>
  );
};

export default BuyBody;
