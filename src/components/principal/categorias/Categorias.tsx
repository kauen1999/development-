import React from "react";
import Link from "next/link";
import { AiFillStar } from "react-icons/ai";
import {MdOutlineTheaterComedy} from 'react-icons/md'
import {IoMdMusicalNote} from 'react-icons/io'
import {MdSportsBasketball} from 'react-icons/md'
import {MdFamilyRestroom} from 'react-icons/md'
import {MdMicExternalOn} from 'react-icons/md'

const Categorias = () => {
  return (
    <section className="w-11/12 mx-auto mt-10">
      <div className="flex gap-4 items-center mb-8">
        <h3 className="font-bold text-3xl">Categorías</h3>
        <Link href="/">
          <div className="text-primary-100 cursor-pointer text-lg font-bold lg:text-base">
            Ver todas
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5 justify-center">

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <MdOutlineTheaterComedy className="text-7xl lg:text-6xl  text-slate-800" />
          <h4 className="font-bold text-slate-500">5 funciones</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Teatro</div>
          </Link>
        </div>

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <MdSportsBasketball className="text-7xl text-slate-800 lg:text-6xl " />
          <h4 className="font-bold text-slate-500">5 partidos</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Deportes</div>
          </Link>
        </div>

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <IoMdMusicalNote className="text-7xl text-slate-800 lg:text-6xl " />
          <h4 className="font-bold text-slate-500">5 conciertos</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Música</div>
          </Link>
        </div>

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <MdFamilyRestroom className="text-7xl text-slate-800 lg:text-6xl " />
          <h4 className="font-bold text-slate-500">5 eventos</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Familia</div>
          </Link>
        </div>

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <MdMicExternalOn className="text-7xl text-slate-800 lg:text-6xl " />
          <h4 className="font-bold text-slate-500">5 funciones</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Stand up</div>
          </Link>
        </div>

        <div className="item flex flex-col items-center rounded-lg gap-2 bg-gris-100 p-5 py-8 lg:p-4 lg:py-7">
          <AiFillStar className="text-7xl text-slate-800 lg:text-6xl " />
          <h4 className="font-bold text-slate-500">5 funciones</h4>
          <Link href="/">
            <div className="font-bold text-primary-100 cursor-pointer">Especiales</div>
          </Link>
        </div>


      </div>
    </section>
  );
};

export default Categorias;
