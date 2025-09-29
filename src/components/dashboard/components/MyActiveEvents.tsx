// src/components/dashboard/components/MyActiveEvents.tsx
import React from "react";
import Link from "next/link";
import { trpc } from "@/utils/trpc";
import { MdEvent, MdTrendingUp, MdCheckCircle, MdSettings, MdPeople } from "react-icons/md";

export default function MyActiveEvents() {
  const { data: events = [], isLoading } =
    trpc.event.listActiveEventsWithStats.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <MdEvent className="text-xl text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Mis Eventos Activos</h2>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
          <p className="text-gray-600">Cargando tus eventos...</p>
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <MdEvent className="text-xl text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Mis Eventos Activos</h2>
        </div>
        
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MdEvent className="text-3xl text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-600">No tenés eventos activos</h3>
          <p className="text-gray-500 mb-4">Creá tu primer evento para comenzar</p>
          <Link
            href="/event/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
          >
            <MdEvent className="text-lg" />
            Crear Evento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <MdEvent className="text-xl text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Mis Eventos Activos</h2>
      </div>

      <div className="space-y-4">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-gray-100 hover:shadow-md"
          >
            {/* Header del evento */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{ev.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MdPeople className="text-lg text-primary-100" />
                    <span>{ev.totalSold}/{ev.totalCapacity} vendidos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MdCheckCircle className="text-lg text-green-500" />
                    <span>{ev.totalValidated} validados</span>
                  </div>
                </div>
              </div>
              
              {/* Botón de gestión */}
              <Link
                href={`/event/manage/${ev.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
              >
                <MdSettings className="text-lg" />
                Gestionar
              </Link>
            </div>

            {/* Estadísticas por categoría */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Estadísticas por categoría:</h4>
              {ev.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3 border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary-100"></div>
                    <span className="font-medium text-gray-800">{cat.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MdTrendingUp className="text-sm text-green-500" />
                      <span>{cat.sold} vendidos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MdCheckCircle className="text-sm text-blue-500" />
                      <span>{cat.validated} validados</span>
                    </div>
                    <span className="text-gray-500">{cat.remaining} restantes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
