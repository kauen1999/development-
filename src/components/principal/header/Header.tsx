// src/components/principal/header/Header.tsx
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../../public/images/logo_new.png";

import { AiOutlineClose } from "react-icons/ai";
import { MdNotificationsNone, MdShoppingCart } from "react-icons/md";
import { HiMenuAlt3 } from "react-icons/hi";
import { IoMdArrowDropdown } from "react-icons/io";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/utils/trpc";
import { useSearchStore } from "@/store/searchStore";

interface Props {
  home?: boolean;
  minimal?: boolean;
}

const HeaderComponent = ({ minimal = false }: Props) => {
  const { data: session } = useSession();
  const { query, setQuery, city, setCity } = useSearchStore();
  const { data: cities = [] } = trpc.search.getAvailableCities.useQuery();
  const { data: cart = [] } = trpc.cart.list.useQuery(undefined, {
    enabled: !!session,
  });

  // Calcular quantidade total de itens no carrinho
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const [openNotifications, setOpenNotifications] = useState(false);
  const [nav, setNav] = useState(false);

  // scroll logic
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
        className={`z-50 transition-transform duration-300 ${
          isTop
            ? "relative translate-y-0"
            : `fixed top-0 left-0 w-full bg-white shadow-md ${
                visible ? "translate-y-0" : "-translate-y-full"
              }`
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-6 h-16 border-b border-gray-200">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="logo" className="h-8 w-auto cursor-pointer" />
            </Link>

            {/* Desktop nav */}
            {!minimal && (
              <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-800">
                <Link href="/">Inicio</Link>
                <Link href="/#artistas">Artistas</Link>
                <Link href="/#eventos-hoy">Eventos hoy</Link>
                <Link href="/#categorias">Categorías</Link>
                <Link href="/#eventos">Eventos</Link>
              </nav>
            )}
          </div>

          {/* Desktop search + cities */}
          {!minimal && (
            <div className="hidden md:flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar eventos..."
                className="h-9 w-48 border border-gray-300 rounded-md px-3 text-sm focus:ring-1 focus:ring-orange-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 w-44 border border-gray-300 rounded-md px-2 text-sm text-gray-700"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop user */}
          <div className="hidden md:flex items-center gap-4">
            {!session ? (
              <Link href="/login">
                <div className="cursor-pointer font-bold text-sm">Iniciar Sesión</div>
              </Link>
            ) : (
              <>
                {/* Carrinho com badge */}
                <Link href="/cart" className="relative">
                  <MdShoppingCart
                    className="cursor-pointer text-gray-700 hover:text-primary-100 transition-colors"
                    size={24}
                  />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary-100 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </span>
                  )}
                </Link>

                <MdNotificationsNone
                  className="cursor-pointer text-gray-700"
                  size={22}
                  onClick={() => setOpenNotifications(!openNotifications)}
                />
                <Image
                  src={session?.user?.image ?? "/avatar.png"}
                  alt="imagen de perfil"
                  width={36}
                  height={36}
                  className="rounded-full border"
                />
                <div className="relative">
                  <div className="dropdown-left dropdown">
                    <label tabIndex={0}>
                      <IoMdArrowDropdown className="cursor-pointer text-gray-700" size={22} />
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content menu rounded-md w-44 bg-white p-2 shadow text-sm"
                    >
                      <p className="border-b py-2 text-center font-semibold">{session?.user?.name}</p>
                      <li><Link href="/profile">Perfil</Link></li>
                      <li><Link href="/cart">🛒 Mi Carrito</Link></li>
                      <li><Link href="/my-tickets">🎟️ Mis Entradas</Link></li>
                      <li onClick={() => signOut()}><span className="text-red-500">Cerrar Sesión</span></li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          {!minimal && (
            <button
              className="md:hidden p-2"
              onClick={() => setNav(true)}
              aria-label="Abrir menú"
            >
              <HiMenuAlt3 size={28} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile sidebar */}
      {nav && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setNav(false)}
          ></div>

          {/* Sidebar content */}
          <div className="relative z-50 w-3/4 max-w-xs h-full bg-white p-6 shadow-lg overflow-y-auto">
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

            {/* Links */}
            <nav className="flex flex-col gap-4 text-base font-medium mb-6">
              <Link href="/" onClick={() => setNav(false)}>Inicio</Link>
              <Link href="/#artistas" onClick={() => setNav(false)}>Artistas</Link>
              <Link href="/#eventos-hoy" onClick={() => setNav(false)}>Eventos hoy</Link>
              <Link href="/#categorias" onClick={() => setNav(false)}>Categorías</Link>
              <Link href="/#eventos" onClick={() => setNav(false)}>Eventos</Link>
            </nav>

            {/* Busca */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar eventos..."
                className="w-full h-9 border rounded-md px-3 text-sm text-gray-700"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Cidades */}
            <div className="mb-6">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-9 border rounded-md px-2 text-sm text-gray-700"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                
                {/* Carrinho mobile com badge */}
                <div className="mb-4">
                  <Link 
                    href="/cart" 
                    onClick={() => setNav(false)}
                    className="flex items-center gap-2 text-gray-700 hover:text-primary-100 transition-colors"
                  >
                    <MdShoppingCart size={20} />
                    <span>Mi Carrito</span>
                    {cartItemsCount > 0 && (
                      <span className="bg-primary-100 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cartItemsCount > 99 ? '99+' : cartItemsCount}
                      </span>
                    )}
                  </Link>
                </div>
                
                <Link href="/profile" onClick={() => setNav(false)}>Perfil</Link><br />
                <Link href="/my-tickets" onClick={() => setNav(false)}>🎟️ Mis Entradas</Link><br />
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
  );
};

export default HeaderComponent;
