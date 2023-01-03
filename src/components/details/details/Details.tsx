import React from "react";
import Datos from "./Datos";

const Details = () => {
  return (
    <section className="my-10">
      <div className="w-11/12 mx-auto lg:w-3/4">
        <h2 className="font-bold text-3xl">Todos los conciertos</h2>
        <div className="mt-5 flex flex-col gap-16">

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="27 Nov" />
            <button className="bg-primary-100 text-white py-3 rounded-lg font-bold lg:px-5">Comprar ahora</button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="31 Dic" />
            <button className="bg-primary-100 text-white py-3 rounded-lg font-bold lg:px-5">Comprar ahora</button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="6 Jul" />
            <button className="bg-primary-100 text-white py-3 rounded-lg font-bold lg:px-5">Comprar ahora</button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="22 Ago" />
            <button className="bg-primary-100 text-white py-3 rounded-lg font-bold lg:px-5">Comprar ahora</button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <Datos fecha="21 Sept" />
            <button className="bg-primary-100 text-white py-3 rounded-lg font-bold lg:px-5">Comprar ahora</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Details;
