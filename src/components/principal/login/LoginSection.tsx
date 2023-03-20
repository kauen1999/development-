import React from "react";
import Image from "next/image";
import Link from "next/link";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { FcGoogle } from "react-icons/fc";
import { AiFillFacebook, AiFillLinkedin } from "react-icons/ai";
import { signIn } from "next-auth/react";

const LoginSection: React.FC = () => {
  return (
    <section className="flex flex-col lg:h-screen lg:flex-row">
      <div className="relative z-0 flex h-[25rem] w-full items-center justify-center lg:h-screen lg:w-1/2">
        <Image
          src={concierto}
          alt="biza"
          layout="fill"
          objectFit="cover"
          quality={100}
          className="-z-10 brightness-50 "
        />

        <Link href={"/"}>
          <div className="absolute top-6 left-6 w-[5rem]">
            <Image src={logo} alt="logo" />
          </div>
        </Link>

        <div className="z-10 mx-auto w-[90%]">
          <h2 className="text-5xl font-bold text-white lg:text-7xl">
            Vive los conciertos.
          </h2>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 bg-slate-100 px-5 py-10 lg:w-1/2">
        <div className="formulario w-full rounded-[2rem] border bg-white p-5 py-10 shadow-lg lg:max-w-lg lg:px-14 lg:pb-14 2xl:max-w-2xl">
          <h2 className="text-center text-3xl font-bold lg:text-4xl">
            Iniciar sesión
          </h2>

          <form className="mt-10 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                className="text-xl font-bold text-primary-100"
                htmlFor="correo"
              >
                Correo Electrónico
              </label>
              <input
                className="border-b rounded-lg"
                type="email"
                name="correo"
                id="correo"
                placeholder="Tu correo aquí"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xl font-bold text-primary-100 "
                htmlFor="contrasena"
              >
                Contraseña
              </label>

              <input
                className="border-b rounded-lg"
                type="password"
                name="contrasena"
                id="contrasena"
                placeholder="Tu contraseña aquí"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-primary-100 py-3 text-xl font-bold text-white"
            >
              Ingresar
            </button>
          </form>
          <div className="flex flex-col p-9 ">
            <button
              className="btn-warning btn my-2 flex bg-white"
              onClick={() => {
                signIn("google", { callbackUrl: "/" });
              }}
            >
              <div className="flex items-center justify-center">
                <FcGoogle className="mr-2 text-4xl" />
                <span className="text-left text-black">
                  Iniciar Sesion con Google
                </span>
              </div>
            </button>
            <button
              className="btn-warning btn btn my-2 bg-[#3b5998] text-white"
              onClick={() => {
                signIn("facebook", { callbackUrl: "/" });
              }}
            >
              <div className="flex items-center justify-center">
                <AiFillFacebook className="mr-2 text-4xl" />
                <span className="text-left">Iniciar Sesion con Facebook</span>
              </div>
            </button>
            <button
              className="btn-warning btn btn my-2 bg-[#0e76a8] text-white"
              onClick={() => {
                signIn("linkedin", { callbackUrl: "/" });
              }}
            >
              <div className="flex items-center justify-center">
                <AiFillLinkedin className="mr-2 text-4xl" />
                <span className="text-left">Iniciar Sesion con Linkedin</span>
              </div>
            </button>
          </div>
          <Link href="#">
            <div className="text-center text-primary-100">
              ¿Todavía no tienes una cuenta?
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LoginSection;
