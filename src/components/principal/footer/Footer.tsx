import React from "react";
import Link from "next/link";
import Image from "next/image";
import logo from '../../../../public/images/logo_white.png'

import { AiFillApple } from "react-icons/ai";
import { FaGooglePlay } from "react-icons/fa";
import { FiFacebook } from "react-icons/fi";
import { AiOutlineInstagram } from "react-icons/ai";
import { TfiTwitter } from "react-icons/tfi";

const Footer = () => {
  return (
    <footer className="bg-primary-100 text-white p-5 lg:p-14 2xl:px-20 flex flex-col gap-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:gap-10">
          <Link href="/">
            <div className="w-max cursor-pointer">Términos y condiciones</div>
          </Link>

          <Link href="/">
            <div className="w-max cursor-pointer">Sobre nosotros</div>
          </Link>

          <Link href="/">
            <div className="w-max cursor-pointer">Preguntas frecuentes</div>
          </Link>
        </div>

        <div className="flex gap-3 items-center">
          <Link href="/">
            <div className="w-max cursor-pointer">Obtén nuestra App</div>
          </Link>

          <AiFillApple className="text-3xl" />
          <FaGooglePlay className="text-2xl" />
        </div>
      </div>

      <hr />

      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="w-[7rem] lg:w-[8rem]">
          <Image src={logo} alt="logo" />
        </div>

        <div className="flex items-center gap-3">
          <p>&copy;EntradaMaster 2022</p>
          <a href="#">
            <FiFacebook className="text-2xl" />
          </a>

          <a href="#">
            <AiOutlineInstagram className="text-2xl" />
          </a>

          <a href="#">
            <TfiTwitter className="text-2xl" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
