// src/components/principal/login/LoginSection.tsx
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { FcGoogle } from "react-icons/fc";
import { AiFillFacebook } from "react-icons/ai";

const LoginSection: React.FC = () => {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleRedirectAfterLogin = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.role === "ADMIN") {
        router.push("/dashboard");
      } else if (session?.user?.profileCompleted) {
        router.push("/");
      } else {
        router.push("/auth");
      }
    } catch (err) {
      console.error("Erro ao obter sessão:", err);
      router.push("/auth");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (res?.ok) {
      await handleRedirectAfterLogin();
    } else {
      setError("Login inválido.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const res = await signIn("google", { redirect: false });
    setIsSubmitting(false);

    if (res?.ok) {
      await handleRedirectAfterLogin();
    } else {
      setError("Falha ao entrar com Google.");
    }
  };

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
          <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold text-primary-100" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                className="rounded-lg border-b"
                type="email"
                id="email"
                placeholder="Tu correo aquí"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold text-primary-100" htmlFor="password">
                Contraseña
              </label>
              <input
                className="rounded-lg border-b"
                type="password"
                id="password"
                placeholder="Tu contraseña aquí"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <span className="-my-2 text-red-500 text-center">{error}</span>
            )}

            <button
              type="submit"
              className="rounded-lg bg-primary-100 py-3 text-xl font-bold text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="flex flex-col p-9">
            <button
              className="btn-warning btn my-2 flex bg-white"
              onClick={handleGoogleLogin}
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
