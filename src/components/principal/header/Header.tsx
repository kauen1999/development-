// src/components/principal/header/Header.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import style from "./Header.module.css";

import logo from "../../../../public/images/logo_new.png";

import { FiFacebook } from "react-icons/fi";
import {
  AiOutlineClose,
  AiOutlineInstagram,
} from "react-icons/ai";
import { MdNotificationsNone } from "react-icons/md";
import { HiMenuAlt3 } from "react-icons/hi";
import { IoMdArrowDropdown } from "react-icons/io";
import { useSession, signOut } from "next-auth/react";
import Notification from "./Notification";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import { useSearchStore } from "@/store/searchStore";

interface Props {
  home?: boolean;
  buyPage?: boolean;
  minimal?: boolean; // usado em checkout
}

const HeaderComponent = ({ home = false, buyPage = false, minimal = false }: Props) => {
  const router = useRouter();
  const [nav, setNav] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const textColor = home ? "[#252525]" : "white";

  const { data: session } = useSession();
  const { query, setQuery, city, setCity } = useSearchStore();

  const { data: cities = [] } = trpc.search.getAvailableCities.useQuery();

  interface NotificationType {
    id: string;
    createdAt: Date;
    title: string;
    description: string;
    userId: string;
  }
  const [notifications] = useState<NotificationType[]>([]);

  const handleNav = () => setNav(!nav);

  // lógica scroll (hide/show)
  const [lastScrollY, setLastScrollY] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isTop, setIsTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsTop(currentScrollY === 0);
      setVisible(currentScrollY < lastScrollY);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <header
        id="inicio"
        className={`z-50 transition-transform duration-300 ${
          isTop
            ? "relative translate-y-0"
            : `fixed top-0 left-0 w-full bg-white shadow-md ${
                visible ? "translate-y-0" : "-translate-y-full"
              }`
        }`}
      >
        {/* conteúdo do header SEM ALTERAÇÃO (igual ao estático) */}
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
            {/* Menu lateral apenas no modo buyPage */}
            {!minimal && buyPage && (
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
                {nav && <div className="fixed top-0 left-0 z-20 h-screen w-full bg-black opacity-75"></div>}
              </>
            )}

            <div className={style.logo_container}>
              <Link href="/"><Image src={logo} alt="logo" className="cursor-pointer" /></Link>
            </div>

            {/* Nav e search */}
            {!minimal && buyPage && (
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

                {/* Sidebar Mobile */}
                {nav && !minimal && (
                  <div className="fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                      className="fixed inset-0 bg-black bg-opacity-50"
                      onClick={() => setNav(false)}
                    ></div>

                    {/* Conteúdo do sidebar */}
                    <div className="relative z-50 w-3/4 max-w-xs h-full bg-white p-6 shadow-lg overflow-y-auto">
                      {/* Botão fechar */}
                      <button
                        onClick={() => setNav(false)}
                        className="absolute top-4 right-4 text-gray-800"
                      >
                        <AiOutlineClose size={28} />
                      </button>

                      {/* Logo */}
                      <div className="flex justify-center mb-6">
                        <Link href="/" onClick={() => setNav(false)}>
                          <Image src={logo} alt="logo" className="h-10 w-auto cursor-pointer" />
                        </Link>
                      </div>

                      {/* Navegação */}
                      {router.pathname === "/" && (
                        <nav className="flex flex-col gap-4 text-lg font-medium mb-6">
                          <Link href="#inicio" onClick={() => setNav(false)}>Inicio</Link>
                          <Link href="#artistas" onClick={() => setNav(false)}>Artistas</Link>
                          <Link href="#eventos-hoy" onClick={() => setNav(false)}>Eventos hoy</Link>
                          <Link href="#categorias" onClick={() => setNav(false)}>Categorías</Link>
                          <Link href="#eventos" onClick={() => setNav(false)}>Eventos</Link>
                        </nav>
                      )}

                      {/* Busca */}
                      <div className="mb-6">
                        <input
                          type="text"
                          placeholder="Buscar eventos..."
                          className="w-full border rounded px-3 py-2 text-gray-700"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>

                      {/* Cidades */}
                      <div className="mb-6">
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full border rounded px-3 py-2 text-gray-700"
                        >
                          <option value="">Todas las ciudades</option>
                          {cities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Redes sociais */}
                      <div className="flex gap-4 mb-6">
                        <a href="#"><FiFacebook size={20} /></a>
                        <a href="#"><AiOutlineInstagram size={20} /></a>
                      </div>

                      {/* Sessão */}
                      {!session ? (
                        <Link
                          href="/login"
                          onClick={() => setNav(false)}
                          className="block mt-6 font-bold text-blue-600"
                        >
                          Iniciar Sesión
                        </Link>
                      ) : (
                        <div>
                          <p className="font-bold mb-4">{session?.user?.name}</p>
                          <Link href="/profile" onClick={() => setNav(false)}>Perfil</Link><br />
                          <Link href="/cart" onClick={() => setNav(false)}>🛒 Mi Carrito</Link><br />
                          <button
                            onClick={() => signOut()}
                            className="mt-4 text-red-500"
                          >
                            Cerrar Sesión
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}


            {!minimal && (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${style.cidade_select} ${style.form_element}`}
              >
                <option value="">Todas las ciudades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
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
                  <Image src={session?.user?.image ?? "/avatar.png"} alt="imagen de perfil" width={50} height={50} />
                </div>
                <div className="relative">
                  <div className="dropdown-left dropdown">
                    <label tabIndex={0}><IoMdArrowDropdown className={style.icon} /></label>
                    <ul tabIndex={0} className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow">
                      <p className="border-b py-2 text-center font-bold">{session?.user?.name}</p>
                      <li><Link href="/profile">Perfil</Link></li>
                      <li><Link href="/cart">🛒 Mi Carrito</Link></li>
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
              <button onClick={() => setOpenNotifications(!openNotifications)} className="rounded-md">✕</button>
            </div>
            {notifications.map((notif) => (
              <div key={notif.id} className="mt-5">
                <Notification notification={notif} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderComponent;
