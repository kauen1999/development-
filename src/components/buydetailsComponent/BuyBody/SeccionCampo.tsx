import React, { SetStateAction } from "react";

interface Props {
  seccion: string;
  precio: number;
  butacas: string;
  cant: string;
  active: boolean;
  setActive: React.Dispatch<React.SetStateAction<boolean>>;
  setPrice: React.Dispatch<React.SetStateAction<number>>;
  setSector: React.Dispatch<React.SetStateAction<string>>;
}

const SeccionCampo = ({
  seccion,
  precio,
  butacas,
  cant,
  active,
  setActive,
  setPrice,
  setSector,
}: Props) => {
  return (
    <button
      className={`btn-warning btn-lg btn my-2 flex items-center justify-between rounded-lg bg-gray-200 ${
        active ? `bg-green-500` : null
      }`}
      onClick={() => {
        setActive(!active);
        setPrice(precio);
        setSector(seccion);
      }}
    >
      <div>
        <p className="text-lg font-bold text-black">{seccion}</p>
        <p className="font-normal text-slate-600">{butacas}</p>
      </div>
      <p className="text-black">{precio * Number(cant)}$ARGS</p>
    </button>
  );
};

export default SeccionCampo;
