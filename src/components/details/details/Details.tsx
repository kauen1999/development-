import React from "react";
import { useRouter } from "next/router";
import Datos from "./Datos";

interface Session {
  id: string;
  date: string;
  venueName: string;
  city: string;
}

interface Props {
  artist: string;
  slug: string;
  image: string;
  sessions?: Session[];
}

const Details: React.FC<Props> = ({
  artist,
  slug,
  image,
  sessions = [],
}) => {
  const router = useRouter();

  const handleNavigation = (sessionId: string) => {
    const url = `/buydetails/${slug}?artist=${encodeURIComponent(artist)}&picture=${encodeURIComponent(
      image
    )}&sessionId=${sessionId}`;
    router.push(url);
  };

  return (
    <section className="my-10">
      <div className="mx-auto w-11/12 lg:w-3/4">
        <h2 className="text-3xl font-bold">Todos los conciertos</h2>

        <div className="mt-5 flex flex-col gap-16">
          {sessions.length > 0 ? (
            sessions.map((session) => {
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
                    onClick={() => handleNavigation(session.id)}
                    className="rounded-lg bg-primary-100 py-3 font-bold text-white lg:px-5"
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
