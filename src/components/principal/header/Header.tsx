// src/components/principal/header/Header.tsx
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import style from "./Header.module.css";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

import logo from "../../../../public/images/logo_new.png";

import { FiFacebook } from "react-icons/fi";
import {
  AiOutlineClose,
  AiOutlineInstagram,
  AiOutlineUser,
} from "react-icons/ai";
import { MdNotificationsNone } from "react-icons/md";
import { AiOutlineSearch } from "react-icons/ai";
import { HiMenuAlt3 } from "react-icons/hi";
import { IoMdArrowDropdown } from "react-icons/io";
import { useSession, signOut } from "next-auth/react";
import Notification from "./Notification";
import { useRouter } from "next/router";

interface Props {
  home?: boolean;
  buyPage?: boolean;
}

const HeaderComponent = ({ home = false, buyPage = false }: Props) => {
  const router = useRouter();
  const [cidade, setCidade] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const datePickerRef = useRef<HTMLInputElement>(null);

  const cidades = [
    "Buenos Aires",
    "Córdoba",
    "Rosario",
    "Mendoza",
    "La Plata",
    "San Miguel de Tucumán",
    "Mar del Plata",
    "Salta",
    "Santa Fe",
    "San Juan",
    "Resistencia",
    "Neuquén",
    "Santiago del Estero",
    "Corrientes",
    "Bahía Blanca",
    "San Salvador de Jujuy",
    "Posadas",
    "Paraná",
    "Formosa",
    "San Luis",
    "La Rioja",
    "Rio Gallegos",
    "Comodoro Rivadavia",
    "San Fernando del Valle de Catamarca",
    "Trelew",
    "Ushuaia",
    "Bariloche",
    "Villa María",
    "Concordia",
    "Rafaela",
    "Pergamino",
  ];

  const handleNav = () => setNav(!nav);
  const [nav, setNav] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const textColor = home ? "[#252525]" : "white";

  interface NotificationType {
    id: string;
    createdAt: Date;
    title: string;
    description: string;
    userId: string;
  }

  const [notifications] = useState<NotificationType[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    const cidadeSalva = localStorage.getItem("cidade");
    if (cidadeSalva) setCidade(cidadeSalva);

    const dataSalva = localStorage.getItem("dataSelecionada");
    if (dataSalva) setDataSelecionada(dataSalva);
  }, []);

  const handleCidadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCidade(e.target.value);
    localStorage.setItem("cidade", e.target.value);
  };

  useEffect(() => {
    if (datePickerRef.current) {
      flatpickr(datePickerRef.current, {
        defaultDate: dataSelecionada || new Date(),
        minDate: new Date(),
        onChange: (selectedDates: Date[]) => {
          if (selectedDates[0]) {
            const dataStr = selectedDates[0].toISOString();
            setDataSelecionada(dataStr);
            localStorage.setItem("dataSelecionada", dataStr);
          }
        },
        position: "below",
      });
    }
  }, [datePickerRef, dataSelecionada]);

  return (
    <>
      <header id="inicio" className={`${style.header}`}>
        <div className={style.container_1}>
          <h5>
            {new Date().toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </h5>
          <div className={style.socials}>
            <a href="#"><FiFacebook className={style.icon} /></a>
            <a href="#"><AiOutlineInstagram className={style.icon} /></a>
          </div>
        </div>

        <div className={style.container_2}>
          <div className={style.left_container}>
            {buyPage && (
              <>
                <div onClick={handleNav} className="z-50 hidden lg:block">
                  {nav ? (
                    <>
                      <div className="h-[33px] w-[33px]"></div>
                      <AiOutlineClose
                        className="fixed top-[70px] left-[40px] cursor-pointer"
                        size={30}
                        style={{ color: `black` }}
                      />
                    </>
                  ) : (
                    <HiMenuAlt3
                      className={`cursor-pointer ${style.hamburger}`}
                      size={33}
                      style={{ color: `${textColor}` }}
                    />
                  )}
                </div>

                <div
                  className={
                    nav
                      ? "fixed top-0 left-0 right-0 bottom-0 z-40 hidden h-screen w-[30%] flex-col items-center justify-between bg-[#ffff] text-center duration-300 ease-in lg:flex"
                      : "fixed top-0 left-[-100%] right-0 bottom-0 z-40 hidden h-screen w-[30%] flex-col items-center justify-between bg-[#ffff] text-center duration-300 ease-in lg:flex"
                  }
                >
                  <div className="h-[10%]"></div>
                  <ul>
                    <li className={style.search_bar}>
                      <input
                        type="text"
                        placeholder="Empezá a buscar tus eventos..."
                        className="mr-3 w-full border-none bg-transparent py-1 px-2 leading-tight text-gray-700 focus:outline-none"
                      />
                      <AiOutlineSearch className={style.icon} />
                    </li>
                    {!session && (
                      <li>
                        <Link href="/login">
                          <div onClick={handleNav} className="my-3 flex items-center justify-center rounded-md border-2 border-black bg-[#ff6c00] py-4 px-9 text-xl text-[#ffff]">
                            <AiOutlineUser size={30} /> Iniciar sesión
                          </div>
                        </Link>
                      </li>
                    )}
                    <li onClick={handleNav} className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]">
                      <Link href="#">Eventos Hoy</Link>
                    </li>
                    <li onClick={handleNav} className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]">
                      <Link href="/">Artistas</Link>
                    </li>
                    <li onClick={handleNav} className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]">
                      <Link href="/">Categorías</Link>
                    </li>
                  </ul>
                  <p className="my-6 text-gray-500">© 2023 EntradaMaster. Todos los derechos reservados.</p>
                </div>
                {nav && <div className="fixed top-0 left-0 z-20 h-screen w-full bg-black opacity-75"></div>}
              </>
            )}

            <div className={style.logo_container}>
              <Link href="/"><Image src={logo} alt="logo" className="cursor-pointer" /></Link>
            </div>

            {!buyPage && (
              <>
                {router.pathname === "/" && (
                  <nav className={style.navigation}>
                    <Link href="/">Inicio</Link>
                    <Link href="#eventos-hoy">Eventos hoy</Link>
                    <Link href="#eventos">Artistas</Link>
                    <Link href="#categorias">Categorías</Link>
                  </nav>
                )}
                <div className="hidden sm:block">
                  <div className={`${style.search_bar} ${style.form_element}`}>
                    <input
                      type="text"
                      placeholder="Empezá a buscar tus eventos..."
                      className="mr-3 w-full border-none bg-transparent py-1 px-2 leading-tight text-gray-700 outline-0 focus:outline-none"
                    />
                    <AiOutlineSearch className={style.icon} />
                  </div>
                </div>
              </>
            )}

            <select
              value={cidade}
              onChange={handleCidadeChange}
              className={`${style.cidade_select} ${style.form_element}`}
            >
              <option value="">Seleccionar ubicación</option>
              {cidades.map((cidade) => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
          </div>

          <div className={style.right_container}>
            {!session ? (
              <Link href="/login"><div className="cursor-pointer font-bold">Iniciar Sesión</div></Link>
            ) : (
              <>
                <div onClick={() => setOpenNotifications(!openNotifications)}>
                  <MdNotificationsNone className={style.icon} />
                </div>
                <div className={style.img_container}>
                  <Image src={`${session?.user?.image}`} alt="imagen de perfil" width={50} height={50} />
                </div>
                <div className="relative">
                  <div className="dropdown-left dropdown">
                    <label tabIndex={0}>
                      <IoMdArrowDropdown className={style.icon} />
                    </label>
                    <ul tabIndex={0} className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow">
                      <p className="border-b py-2 text-center font-bold">{session?.user?.name}</p>
                      <li><Link href="/profile">Perfil</Link></li>
                      <li onClick={() => signOut()}><span>Cerrar Sesión</span></li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {openNotifications && (
        <div className="fixed top-0 z-50 h-full w-full bg-gray-800 bg-opacity-90">
          <div className="absolute right-0 h-full bg-gray-50 p-8 2xl:w-4/12">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">Notificaciones</p>
              <button onClick={() => setOpenNotifications(!openNotifications)} className="rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                ✕
              </button>
            </div>
            {notifications.map((notif) => (
              <div key={notif.id} className="mt-5">
                <Notification notification={notif} />
              </div>
            ))}
            <div className="flex items-center">
              <hr className="w-full" />
              <p className="px-3 py-16 text-sm text-gray-500">Eso es todo por ahora :)</p>
              <hr className="w-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderComponent;
