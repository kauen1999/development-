// src/components/principal/login/LoginSection.tsx
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { FcGoogle } from "react-icons/fc";
import { AiFillFacebook } from "react-icons/ai";
import { signIn } from "next-auth/react";
import { useFormik } from "formik";
import { loginSchema } from "@/modules/auth/schema";
import { toFormikValidationSchema } from "zod-formik-adapter";

const LoginSection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: toFormikValidationSchema(loginSchema),
   onSubmit: async (values) => {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl: "/",
    });
    setIsSubmitting(false);
    console.log("Resultado do signIn:", result);
    if (result?.ok) {
      // Aqui está o segredo!
      window.location.reload();
    } else {
      formik.setErrors({
        email: "Correo o contraseña incorrectos",
        password: "Correo o contraseña incorrectos",
      });
    }
  },

  });

  return (
    <section className="flex flex-col lg:h-screen lg:flex-row">
      {/* ... (seu HTML original) ... */}
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

          <form
            className="mt-10 flex flex-col gap-5"
            onSubmit={formik.handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <label
                className="text-xl font-bold text-primary-100"
                htmlFor="correo"
              >
                Correo Electrónico
              </label>
              <input
                className="rounded-lg border-b"
                type="email"
                id="email"
                placeholder="Tu correo aquí"
                {...formik.getFieldProps("email")}
                disabled={isSubmitting}
              />
              {formik.errors.email && formik.touched.email ? (
                <span className="-my-2 text-red-500">
                  {formik.errors.email}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-xl font-bold text-primary-100 "
                htmlFor="contrasena"
              >
                Contraseña
              </label>

              <input
                className="rounded-lg border-b"
                type="password"
                id="password"
                placeholder="Tu contraseña aquí"
                {...formik.getFieldProps("password")}
                disabled={isSubmitting}
              />
              {formik.errors.password && formik.touched.password ? (
                <span className="-my-2 text-red-500">
                  {formik.errors.password}
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              className="rounded-lg bg-primary-100 py-3 text-xl font-bold text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          <div className="flex flex-col p-9 ">
            <button
              className="btn-warning btn my-2 flex bg-white"
              onClick={() => {
                signIn("google", { callbackUrl: "/" });
              }}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-center">
                <AiFillFacebook className="mr-2 text-4xl" />
                <span className="text-left">Iniciar Sesion con Facebook</span>
              </div>
            </button>
          </div>
          <Link href="/register">
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
