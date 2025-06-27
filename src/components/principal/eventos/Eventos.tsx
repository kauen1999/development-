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
    <section className="w-11/12 mx-auto mt-10 pb-10">
      <div className="flex gap-4 items-center mb-8">
        <h3 className="font-bold text-3xl">Eventos</h3>
        <Link href="/">
          <div className="text-primary-100 cursor-pointer text-lg lg:text-base font-bold">
            Ver todos
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p1}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p2}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p3}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p4}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p5}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p6}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p7}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p8}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p9}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p10}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p11}
        />

        <Card
          duracion="19:35 hasta las 21:00"
          ubicacion="Estadium Luna Park"
          ciudad="Buenos Aires"
          foto={p12}
        />
      </div>
    </section>
  );
};

export default Eventos;
