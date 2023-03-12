import React from "react";

interface Props {
  seccion: string;
  precio: number;
  butacas: string;
  cant: string;
}

const SeccionCampo = ({ seccion, precio, butacas, cant }: Props) => {
  return (
    <button className="btn-warning btn-lg btn my-2 flex items-center justify-between rounded-lg bg-gray-200">
      <div>
        <p className="text-lg font-bold text-black">{seccion}</p>
        <p className="font-normal text-slate-600">{butacas}</p>
      </div>
      <p className="text-black">{precio * Number(cant)}$ARGS</p>
    </button>
  );
};

export default SeccionCampo;
