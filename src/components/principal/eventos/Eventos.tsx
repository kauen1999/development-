// src/components/principal/eventos/Eventos.tsx
import React, { useState } from "react";
import Card from "./EventoCard";
import { AiOutlineSearch } from "react-icons/ai";
import style from "./../header/Header.module.css";
import { trpc } from "@/utils/trpc";
import Spinner from "@/components/principal/loader/Spinner";

const Eventos = () => {
  const [categoria, setCategoria] = useState("Todos");

  const { data: events = [], isLoading } = trpc.event.list.useQuery();
  const { data: categoriasDb = [], isLoading: loadingCats } = trpc.category.list.useQuery();

  const categorias = ["Todos", ...categoriasDb.map((c) => c.title)];

  const eventosFiltrados =
    categoria === "Todos"
      ? events
      : events.filter((event) => event.category?.title === categoria);

  return (
    <section id="eventos" className="mx-auto mt-10 w-11/12 pb-10">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos</h3>
      </div>

      <div className="mb-6 flex flex-nowrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          {loadingCats ? (
            <Spinner />
          ) : (
            categorias.map((cat) => (
              <button
                key={cat}
                className={`rounded-lg px-4 py-2 ${
                  categoria === cat ? "bg-primary-100 text-white" : "bg-gray-200"
                }`}
                onClick={() => setCategoria(cat)}
              >
                {cat}
              </button>
            ))
          )}
        </div>

        <div className={`${style.search_bar} ${style.form_element}`}>
          <input
            type="text"
            style={{ width: "400px" }}
            className="mr-3 w-full appearance-none border-none bg-transparent py-1 px-2 leading-tight text-gray-700 outline-0 focus:outline-none"
            name="search"
            placeholder="Búsqueda por nombre, artista, ciudad, fecha..."
          />
          <AiOutlineSearch className={style.icon} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
          <span className="ml-3 text-lg font-bold text-primary-100">
            Cargando eventos...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {eventosFiltrados.map((event) => (
            <Card
              key={event.id}
              slug={event.slug}
              artist={event.name}
              fecha={
                event.eventSessions?.[0]
                  ? new Date(event.eventSessions[0].date).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Sin fecha"
              }
              foto={event.image ?? ""}
              ubicacion={event.venueName}
              ciudad={event.city}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Eventos;
