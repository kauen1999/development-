// src/components/BuyBody/SeccionCampo.tsx
import React from "react";

interface Props {
  seccion: string;
  precio: number;
  butacas: string;
  cant: string;
  active: boolean;
  setActive: React.Dispatch<React.SetStateAction<boolean>>;
  setPrice: React.Dispatch<React.SetStateAction<number>>;
  setSector: React.Dispatch<React.SetStateAction<string>>;
  disable: boolean;
}

const SeccionCampo: React.FC<Props> = ({
  seccion,
  precio,
  butacas,
  cant,
  active,
  setActive,
  setPrice,
  setSector,
  disable,
}) => {
  const renderEnabledButton = () => (
    <button
      className={`btn-warning btn-lg btn my-2 flex items-center justify-between rounded-lg bg-gray-200 ${
        active ? `bg-green-500` : ""
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

  const renderDisabledButton = () => (
    <button className="btn-warning-disabled btn-lg btn my-2 flex items-center justify-between rounded-lg bg-gray-200">
      <div>
        <p className="text-lg font-bold text-gray-500">{seccion}</p>
        <p className="font-normal text-slate-600">{butacas}</p>
      </div>
      <p className="text-gray-500">{precio * Number(cant)}$ARGS</p>
    </button>
  );

  return disable ? renderDisabledButton() : renderEnabledButton();
};

export default SeccionCampo;
