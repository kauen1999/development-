import React from "react";
import Link from "next/link";
import Card from "./EventoCard";

import p1 from "../../../../public/images/p1.jpg";
import p2 from "../../../../public/images/p2.jpg";
import p3 from "../../../../public/images/p3.jpg";
import p4 from "../../../../public/images/p4.jpg";
import p5 from "../../../../public/images/p5.jpg";
import p6 from "../../../../public/images/p6.jpg";
import p7 from "../../../../public/images/p7.jpg";
import p8 from "../../../../public/images/p8.jpg";
import p9 from "../../../../public/images/p9.jpg";
import p10 from "../../../../public/images/p10.jpg";
import p11 from "../../../../public/images/p11.jpg";
import p12 from "../../../../public/images/p12.jpg";

const Eventos = () => {
  return (
    <section className="mx-auto mt-10 w-11/12 pb-10">
      <div className="mb-8 flex items-center gap-4">
        <h3 className="text-3xl font-bold">Eventos</h3>
        <Link href="/">
          <div className="cursor-pointer text-lg font-bold text-primary-100 lg:text-base">
            Ver todos
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          artist="Emilia"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p1}
        />

        <Card
          artist="Fabiana Cantillo"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p2}
        />

        <Card
          artist="Destino San Javier"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p3}
        />

        <Card
          artist="Palito Ortega"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p4}
        />

        <Card
          artist="Ara Malikian"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p5}
        />

        <Card
          artist="Soy Rada"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p6}
        />

        <Card
          artist="La konga"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p7}
        />

        <Card
          artist="The Beats"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p8}
        />

        <Card
          artist="Marcela Morelo"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p9}
        />

        <Card
          artist="Dante Gebel"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p10}
        />

        <Card
          artist="Gustavo Cordera"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p11}
        />

        <Card
          artist="Lucas Sugo"
          fecha="1 de Abril"
          ubicacion="Auditorio de Belgrano"
          ciudad="Buenos Aires"
          foto={p12}
        />
      </div>
    </section>
  );
};

export default Eventos;
