// src/components/dashboard/components/MyActiveEvents.tsx
import React from "react";
import Link from "next/link";
import { trpc } from "@/utils/trpc";

export default function MyActiveEvents() {
  const { data: events = [], isLoading } =
    trpc.event.listActiveEventsWithStats.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-600">Cargando eventos...</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-600">No se encontraron eventos activos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold text-gray-700">
        Mis eventos activos
      </h2>

      {events.map((ev) => (
        <div
          key={ev.id}
          className="mb-6 rounded border border-gray-200 p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-800">{ev.name}</h3>
          <p className="text-sm text-gray-600 mb-2">
            Total: {ev.totalSold}/{ev.totalCapacity} vendidos • {ev.totalValidated} validados
          </p>

          <div className="mt-3 space-y-1">
            {ev.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between border-b py-1 text-sm"
              >
                <span>{cat.title}</span>
                <span>
                  {cat.sold} vendidos • {cat.validated} validados / {cat.remaining} restantes
                </span>
              </div>
            ))}
          </div>

          {/* Botón para ir a gestionar */}
          <div className="mt-4 flex justify-end">
            <Link
              href={`/event/manage/${ev.id}`}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-sm font-medium transition"
            >
              Gestionar
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
