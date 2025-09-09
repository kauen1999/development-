// src/components/principal/eventos/Eventos.tsx
import React, { useState } from "react";
import Card from "./EventoCard";
import { trpc } from "@/utils/trpc";
import Spinner from "@/components/principal/loader/Spinner";
import { useSearchStore } from "@/store/searchStore";

const Eventos = () => {
  const [categoria, setCategoria] = useState("Todos");
  const { query, city } = useSearchStore();

  const { data, isLoading } = trpc.search.global.useQuery({ query, city });
  const { data: categoriasDb = [], isLoading: loadingCats } = trpc.category.list.useQuery();

  const categorias = ["Todos", ...categoriasDb.map((c) => c.title)];
  const events = data?.events ?? [];

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
        {/* Filtros de categoria */}
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
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
          <span className="ml-3 text-lg font-bold text-primary-100">
            Cargando eventos...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {eventosFiltrados.map((event) => {
            const firstSession = event.eventSessions[0];
            return (
              <Card
                key={event.id}
                slug={event.slug}
                artist={event.name}
                fecha={
                  firstSession
                    ? new Date(firstSession.dateTimeStart).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Sin fecha"
                }
                foto={event.image ?? ""}
                ubicacion={firstSession?.venueName ?? ""}
                ciudad={firstSession?.city ?? ""}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Eventos;
