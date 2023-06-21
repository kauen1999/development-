import React from "react";
import Link from "next/link";
import Card from "./EventoCard";
import { cards } from "../../../data";

const Eventos = () => {
  return (
    <section className="mx-auto mt-10 w-11/12 pb-10">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos</h3>
        <Link href="/">
          <div className="cursor-pointer text-lg font-bold text-primary-100 lg:text-base">
            Ver todos
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            artist={card.artist}
            fecha={card.fecha}
            ubicacion={card.ubicacion}
            ciudad={card.ciudad}
            foto={card.foto}
          />
        ))}
      </div>
    </section>
  );
};

export default Eventos;
