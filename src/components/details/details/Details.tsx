// src/components/details/details/Details.tsx
import React, { useMemo } from "react";
import { useRouter } from "next/router";
import Datos from "./Datos";

interface Session {
  id: string;
  slug: string;
  date: string;   
  venueName: string;
  city: string;
}

interface Props {
  artist: string;

  description?: string;
  venueName?: string;
  city?: string;

  sessions?: Session[];
}

const Details: React.FC<Props> = ({
  artist,
  description,
  venueName,
  city,
  sessions = [],
}) => {
  const router = useRouter();

  const orderedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [sessions]);

  const handleNavigation = (sessionSlug: string) => {
    router.push(`/buydetails/${encodeURIComponent(sessionSlug)}`);
  };

  return (
    <section className="my-10">
      <div className="mx-auto w-11/12 lg:w-3/4">
        <h2 className="text-3xl font-bold">Todos los conciertos</h2>

        {/* Descripción del evento */}
        {description && (
          <p className="mt-2 text-gray-600">{description}</p>
        )}

        {/* Ubicación si no hay sesiones */}
        {!orderedSessions.length && (venueName || city) && (
          <div className="mt-3 text-gray-700">
            {venueName && <span className="mr-2">{venueName}</span>}
            {city && <span>{city}</span>}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-16">
          {orderedSessions.length > 0 ? (
            orderedSessions.map((session) => {
              const dateObj = new Date(session.date);

              const fecha = dateObj.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "short",
              });

              const hora = dateObj.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 lg:flex-row lg:justify-between"
                >
                  <Datos
                    fecha={fecha}
                    hora={hora}
                    artist={artist}
                    venue={session.venueName}
                    city={session.city}
                  />

                  <button
                    onClick={() => handleNavigation(session.slug)}
                    className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
                    aria-label="Comprar entrada para esta sesión"
                  >
                    Comprar ahora
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No hay conciertos disponibles.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Details;
