import React, { useState } from "react";
import Link from "next/link";
import Card from "./EventoCard";
import { cards } from "../../../data";
import { AiOutlineSearch } from "react-icons/ai";
import style from "./../header/Header.module.css";

const Eventos = () => {
  const [categoria, setCategoria] = useState("Todos");

  const categorias = [
    "Todos",
    "Culinaria",
    "Deportes",
    "Especiales",
    "Familia",
    "Literatura",
    "Música",
    "Stand Up",
    "Teatro",
  ];

  const eventosFiltrados =
    categoria === "Todos"
      ? cards
      : cards.filter((card) => card.categoria === categoria);

  return (
    <section id="eventos" className="mx-auto mt-10 w-11/12 pb-10">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos</h3>
      </div>

      {/* Botões de filtro por categoria */}
      <div className="mb-6 flex flex-nowrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          {categorias.map((cat) => (
            <button
              key={cat}
              className={`rounded-lg px-4 py-2 ${
                categoria === cat ? "bg-primary-100 text-white" : "bg-gray-200"
              }`}
              onClick={() => setCategoria(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={`${style.search_bar} ${style.form_element}`}>
          <input
            type="text"
            style={{ width: "400px"}}
            className="mr-3 w-full appearance-none border-none bg-transparent py-1 px-2 leading-tight text-gray-700 outline-0 focus:outline-none"
            name="search"
            placeholder="Búsqueda por nombre, artista, ciudad, fecha..."
          />
          <AiOutlineSearch className={style.icon} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {eventosFiltrados.map((card, index) => (
          <Card
            key={card.artist + card.fecha}
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
