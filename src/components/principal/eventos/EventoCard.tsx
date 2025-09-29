// src/components/principal/eventos/EventoCard.tsx
import React from "react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { MdAccessTime, MdLocationOn, MdEvent } from "react-icons/md";
import Link from "next/link";

type Props = {
  slug: string; 
  artist: string;
  fecha: string;
  foto: string | StaticImageData;
  ubicacion: string;
  ciudad: string;
};

const EventoCard = ({ slug, artist, fecha, ubicacion, ciudad, foto }: Props) => {
  return (
    <article className="group relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
      <Link href={`/eventdetail/${slug}`} className="block">
        {/* Imagen del evento */}
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={foto}
            alt={`Evento: ${artist}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badge de evento */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-white">
              <MdEvent className="text-sm" />
              Evento
            </div>
          </div>
        </div>

        {/* Contenido del card */}
        <div className="p-4">
          <h3 className="mb-3 text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-primary-100 transition-colors">
            {artist}
          </h3>

          <div className="space-y-2">
            {/* Fecha */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MdAccessTime className="text-lg text-primary-100" />
              <span className="font-medium">{fecha}</span>
            </div>

            {/* Ubicación */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MdLocationOn className="mt-0.5 text-lg text-primary-100 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{ubicacion}</p>
                <p className="text-gray-500">{ciudad}</p>
              </div>
            </div>
          </div>

          {/* Botón de acción */}
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-white transition-all group-hover:bg-orange-600">
              Ver detalles
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default EventoCard;
