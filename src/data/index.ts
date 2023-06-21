import { StaticImageData } from "next/image";

interface Card {
  artist: string;
  fecha: string;
  ubicacion: string;
  ciudad: string;
  foto: StaticImageData;
}

interface HoyCardProps {
  foto: StaticImageData;
  titulo: string;
  horas: string;
  fecha: string;
  precio: string;
  duracion: string;
  ubicacion: string;
  ciudad: string;
}

export const hoyCard: HoyCardProps[] = [
  {
    foto: "/images/queen.jpg" as unknown as StaticImageData,
    titulo: "Queen",
    horas: "Dentro de 5:21 horas",
    fecha: "21 Jun",
    precio: "7.000$",
    duracion: "19:20 hasta 21:30",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
  },
  {
    foto: "/images/dante.jpg" as unknown as StaticImageData,
    titulo: "Dante Gebel",
    horas: "Dentro de 5:21 horas",
    fecha: "22 Jun",
    precio: "7.000$",
    duracion: "19:20 hasta 22:00",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
  },
  {
    foto: "/images/cuarteto.jpg" as unknown as StaticImageData,
    titulo: "Cuarteto de nos",
    horas: "Dentro de 8:05 horas",
    fecha: "02 Dic",
    precio: "7.000$",
    duracion: "15:20 hasta 21:30",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
  },
  {
    foto: "/images/dante.jpg" as unknown as StaticImageData,
    titulo: "Dante Gebel",
    horas: "Dentro de 5:21 horas",
    fecha: "22 Jun",
    precio: "7.000$",
    duracion: "19:20 hasta 22:00",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
  },
];

export const cards: Card[] = [
  {
    artist: "Emilia",
    fecha: "15 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p1.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Fabiana Cantillo",
    fecha: "16 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p2.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Destino San Javier",
    fecha: "17 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p3.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Palito Ortega",
    fecha: "18 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p4.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Ara Malikian",
    fecha: "19 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p5.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Soy Rada",
    fecha: "20 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p6.jpg" as unknown as StaticImageData,
  },
  {
    artist: "La konga",
    fecha: "21 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p7.jpg" as unknown as StaticImageData,
  },
  {
    artist: "The Beats",
    fecha: "22 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p8.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Marcela Morelo",
    fecha: "23 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p9.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Dante Gebel",
    fecha: "24 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p10.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Gustavo Cordera",
    fecha: "25 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p11.jpg" as unknown as StaticImageData,
  },
  {
    artist: "Lucas Sugo",
    fecha: "26 de Julio",
    ubicacion: "Auditorio de Belgrano",
    ciudad: "Buenos Aires",
    foto: "/images/p12.jpg" as unknown as StaticImageData,
  },
];
