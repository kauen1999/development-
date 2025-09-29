// src/components/principal/eventos/Eventos.tsx
import React, { useState } from "react";
import Card from "./EventoCard";
import { trpc } from "@/utils/trpc";
import Spinner from "@/components/principal/loader/Spinner";
import { useSearchStore } from "@/store/searchStore";
import { MdEvent, MdFilterList } from "react-icons/md";

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
      {/* Header da seção */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <MdEvent className="text-3xl text-white" />
        </div>
        <h3 className="mb-2 text-3xl md:text-4xl font-bold text-gray-900">Eventos</h3>
        <p className="text-base md:text-lg text-gray-600">
          Descubrí los mejores eventos y experiencias
        </p>
      </div>

      {/* Filtros de categoria */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <MdFilterList className="text-xl text-primary-100" />
          <h4 className="text-lg font-semibold text-gray-800">Filtrar por categoría</h4>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {loadingCats ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Spinner />
              <span>Cargando categorías...</span>
            </div>
          ) : (
            categorias.map((cat) => (
              <button
                key={cat}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all hover:shadow-md ${
                  categoria === cat 
                    ? "bg-primary-100 text-white shadow-lg" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
          <h2 className="mb-2 text-xl font-bold text-gray-700">Cargando eventos...</h2>
          <p className="text-gray-600">Buscando los mejores eventos para vos</p>
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MdEvent className="text-3xl text-gray-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-600">No se encontraron eventos</h2>
          <p className="text-gray-500">
            {categoria === "Todos" 
              ? "No hay eventos disponibles en este momento" 
              : `No hay eventos en la categoría "${categoria}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
