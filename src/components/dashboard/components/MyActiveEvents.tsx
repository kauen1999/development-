// src/components/dashboard/components/MyActiveEvents.tsx
import React from "react";
import { trpc } from "@/utils/trpc";

export default function MyActiveEvents() {
  const { data: events = [], isLoading } =
    trpc.event.listActiveEventsWithStats.useQuery();

  if (isLoading) return <p>Carregando eventos...</p>;
  if (!events.length) return <p>Nenhum evento ativo encontrado.</p>;

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold text-gray-700">
        Meus eventos ativos
      </h2>
      {events.map((ev) => (
        <div
          key={ev.id}
          className="mb-6 rounded border border-gray-200 p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-800">{ev.name}</h3>
          <p className="text-sm text-gray-600">
            Total: {ev.totalSold}/{ev.totalCapacity} vendidos
          </p>
          <div className="mt-3">
            {ev.categories.map((cat) => (
              <div
                key={cat.title}
                className="flex justify-between border-b py-1 text-sm"
              >
                <span>{cat.title}</span>
                <span>
                  {cat.sold} vendidos / {cat.remaining} restantes
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
