import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import style from "./Header.module.css";

import logo from "../../../../public/images/logo_new.png";

import { FiFacebook } from "react-icons/fi";
import {
  AiOutlineClose,
  AiOutlineInstagram,
  AiOutlineUser,
} from "react-icons/ai";
import { TfiTwitter } from "react-icons/tfi";
import { AiOutlineSearch } from "react-icons/ai";
import { MdNotificationsNone } from "react-icons/md";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { HiMenuAlt3 } from "react-icons/hi";
import { IoMdArrowDropdown } from "react-icons/io";
import { useSession, signOut } from "next-auth/react";

interface Props {
  home?: boolean | undefined;
  buyPage?: boolean | undefined;
}

const Header = ({ home, buyPage }: Props) => {
  const [nav, setNav] = useState(false);
  const [dropdown, setDropdow] = useState(false);
  const [dateState, setDateState] = useState(new Date());
  const [textColor, setTextColor] = useState(home ? "[#252525]" : "white");

  const { data: session } = useSession();

  // const { data: user } = trpc.auth.getUserById.useQuery(sessionData?.user?.id);

  useEffect(() => {
    setInterval(() => setDateState(new Date()), 1);
  }, []);

  const handleNav = () => {
    setNav(!nav);
  };

  const handleDropdown = () => {
    setDropdow(!dropdown);
  };

  return (
    <header className={style.header}>
      <div className={style.container_1}>
        <h5>
          {" "}
          {dateState.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </h5>
        <div className={style.socials}>
          <a href="#">
            <FiFacebook className={style.icon} />
          </a>

          <a href="#">
            <AiOutlineInstagram className={style.icon} />
          </a>

          <a href="#">
            <TfiTwitter className={style.icon} />
          </a>
        </div>
      </div>

      <div className={style.container_2}>
        <div className={style.left_container}>
          {buyPage ? (
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
                  <div className={style.search_bar}>
                    <input
                      type="text"
                      name="search"
                      id="search"
                      placeholder="Empezá a buscar tus eventos..."
                    />
                    <AiOutlineSearch className={style.icon} />
                  </div>
                  {!session ? (
                    <div>
                      <Link href="/login">
                        <div
                          onClick={handleNav}
                          className="my-3 flex cursor-pointer items-center justify-center rounded-md border-2 border-black bg-[#ff6c00] py-4 px-9 text-xl text-[#ffff]"
                        >
                          <AiOutlineUser size={30} />
                          Iniciar sesión
                        </div>
                      </Link>
                    </div>
                  ) : null}

                  <Link href="#">
                    <li
                      onClick={handleNav}
                      className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
                    >
                      Eventos Hoy
                    </li>
                  </Link>

                  <li
                    onClick={handleNav}
                    className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
                  >
                    <Link href="/">Artistas</Link>
                  </li>
                  <li
                    onClick={handleNav}
                    className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
                  >
                    <Link href="/">Categorías</Link>
                  </li>
                </ul>
                <p className="my-6 text-gray-500">
                  © 2023 EntradaMaster. Todos los derechos reservados.
                </p>
              </div>
              {nav ? (
                <div className="fixed top-0 left-0 z-20 h-screen w-full bg-black opacity-75"></div>
              ) : null}
            </>
          ) : null}

          <div className={style.logo_container}>
            <Link href={"/"}>
              <Image src={logo} alt="logo" className="cursor-pointer" />
            </Link>
          </div>

          {!buyPage ? (
            <>
              <nav>
                <Link href={"/"}>Inicio</Link>
                <Link href="#">Eventos hoy</Link>
                <Link href="#">Artistas</Link>
                <Link href="#">Categorías</Link>
              </nav>

              <div className={style.search_bar}>
                <input
                  type="text"
                  name="search"
                  id="search"
                  placeholder="Empezá a buscar tus eventos..."
                />
                <AiOutlineSearch className={style.icon} />
              </div>
            </>
          ) : null}
        </div>

        <div className={style.right_container}>
          {!session ? (
            <>
              <Link href={"/login"}>
                <div className="cursor-pointer font-bold">Iniciar Sesión</div>
              </Link>
            </>
          ) : (
            <>
              <Link href="#">
                <MdNotificationsNone className={style.icon} />
              </Link>

              <Link href="#">
                <AiOutlineShoppingCart className={style.icon} />
              </Link>

              <div className={style.img_container}>
                <Image
                  src={`${session?.user?.image}`}
                  alt="imagen de perfil"
                  width={50}
                  height={50}
                />
              </div>
              <Link href="#">
                <div className="relative">
                  <div className="dropdown-left dropdown">
                    <label tabIndex={0}>
                      <IoMdArrowDropdown className={style.icon} />
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow"
                    >
                      <p className="border-b py-2 text-center font-bold">
                        {session && session.user?.name}
                      </p>
                      <li>
                        <Link href={"/profile"}>Perfil</Link>
                      </li>
                      <li onClick={() => signOut()}>
                        <span>Cerrar Sesión</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>

        <div onClick={handleNav} className="z-5 0 block lg:hidden">
          {nav ? (
            <AiOutlineClose
              className="fixed right-6 top-[70px] cursor-pointer"
              size={30}
              style={{ color: `black` }}
            />
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
              ? "fixed top-0 left-0 right-0 bottom-0 z-40 flex h-screen w-full items-center justify-center bg-[#ffff] text-center duration-300 ease-in lg:hidden"
              : "fixed top-0 left-[-100%] right-0 bottom-0 z-40 flex h-screen w-full items-center justify-center bg-[#ffff] text-center duration-300 ease-in lg:hidden"
          }
        >
          <ul>
            {!session ? (
              <div>
                <Link href="/login">
                  <div
                    onClick={handleNav}
                    className="my-3 flex cursor-pointer items-center justify-center rounded-md border-2 border-black bg-[#ff6c00] py-4 px-9 text-xl text-[#ffff]"
                  >
                    <AiOutlineUser size={30} />
                    Iniciar sesión
                  </div>
                </Link>
              </div>
            ) : (
              <div>
                <Link href="/">
                  <div
                    onClick={handleNav}
                    className="my-3 flex cursor-pointer items-center justify-center rounded-md border-2 border-black bg-[#ff6c00] py-4 px-9 text-xl text-[#ffff]"
                  >
                    <AiOutlineUser size={30} />
                    Cuenta
                  </div>
                </Link>
              </div>
            )}

            <Link href="#">
              <li
                onClick={handleNav}
                className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
              >
                Eventos Hoy
              </li>
            </Link>

            <li
              onClick={handleNav}
              className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
            >
              <Link href="/">Artistas</Link>
            </li>
            <li
              onClick={handleNav}
              className="my-3 cursor-pointer rounded-md border-2 border-black bg-[#ffff] py-4 px-9 text-xl text-[#000000]"
            >
              <Link href="/">Categorías</Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
