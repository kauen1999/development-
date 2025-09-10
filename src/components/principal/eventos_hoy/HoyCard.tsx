// src/components/principal/eventos_hoy/HoyCard.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BiTimeFive } from "react-icons/bi";
import { CiLocationOn } from "react-icons/ci";

interface HoyCardProps {
  event: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    category: { title: string };
    eventSessions: {
      id: string;
      dateTimeStart: Date;
      durationMin: number;
      venueName: string;
      city: string;
      ticketCategories: {
        id: string;
        title: string;
        price: number;
        currency: string;
      }[];
    }[];
  };
}

const getSafeImage = (url: string | null): string => {
  if (!url || url.trim() === "" || url.startsWith("blob:")) {
    return "/vercel.svg";
  }
  return url;
};

const HoyCard: React.FC<HoyCardProps> = ({ event }) => {
  const imageSrc = getSafeImage(event.image);

  // pega a primeira sessão (como referência para "hoy")
  const session = event.eventSessions[0];
  if (!session) return null;

  // formatar data no estilo "jue., 7 ago. 2025"
  const fecha = new Date(session.dateTimeStart)
    .toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");

  // formatar hora no padrão 24h
  const horas = new Date(session.dateTimeStart).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duracion = `${session.durationMin} min`;

  // pegar preço mínimo entre as categorias
  const minPrecio = session.ticketCategories.length
    ? Math.min(...session.ticketCategories.map((t) => t.price))
    : 0;
  const precio = minPrecio > 0 ? `$${minPrecio}` : "Gratis";

  return (
    <article className="max-w-md rounded-2xl shadow-xl lg:max-w-lg">
      <div className="relative h-[200px] lg:h-[13vw]">
        <Image
          src={imageSrc}
          alt={event.name}
          width={500}
          height={500}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          className="rounded-2xl"
        />
        <h3 className="absolute top-5 left-3 text-3xl font-bold text-white lg:text-2xl">
          {event.name}
        </h3>
        <h4 className="absolute bottom-5 left-3 font-bold text-white">
          {horas}
        </h4>
      </div>

      <div className="grid grid-cols-2 p-4 lg:text-sm">
        <div className="izq flex flex-col justify-between">
          <h4 className="my-5 text-3xl font-bold lg:text-2xl">{fecha}</h4>
          <div>
            <p className="text-primary-100">Precio desde</p>
            <h4 className="text-2xl font-bold text-primary-100 lg:text-xl">
              {precio}
            </h4>
          </div>
        </div>

        <div className="der flex flex-col gap-6 lg:gap-4">
          <div className="flex items-center gap-1">
            <BiTimeFive className="text-2xl text-slate-500" />
            <h5 className="font-bold">{duracion}</h5>
          </div>

          <div className="flex items-center gap-1">
            <CiLocationOn className="text-2xl text-slate-500" />
            <div>
              <h5 className="font-bold leading-none">{session.venueName}</h5>
              <h5 className="text-slate-500">{session.city}</h5>
            </div>
          </div>

          <Link href={`/buydetails/${event.slug}`}>
            <div className="cursor-pointer rounded-lg bg-primary-100 py-2 px-5 text-center text-xl font-bold text-white lg:text-base">
              Comprar ahora
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default HoyCard;
