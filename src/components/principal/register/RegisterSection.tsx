// src/components/principal/register/RegisterSection.tsx
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { LoadingButton } from "../loader/LoadingButton";
import { FaInfoCircle } from "react-icons/fa";
import { trpc } from "@/utils/trpc";

const RegisterSection: React.FC = () => {
  const router = useRouter();
  const register = trpc.auth.register.useMutation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    register.mutate(form, {
      onSuccess: () => {
        setShowSuccessModal(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
      onError: (err) => setError(err.message || "Erro ao registrar"),
    });
  };

  return (
    <section className="flex flex-col lg:h-screen lg:flex-row">
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-2xl font-bold text-green-600">
              Registro exitoso
            </h2>
            <p className="text-gray-700">Serás redirigido para completar tu perfil...</p>
          </div>
        </div>
      )}
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
        <div className="formulario w-full rounded-[2rem] border bg-white p-5 py-5 shadow-lg lg:max-w-lg lg:px-14 lg:pb-1 2xl:max-w-2xl">
          <h2 className="text-center text-3xl font-bold lg:text-4xl">
            Registro
          </h2>
          {error && (
            <div className="alert alert-error -mb-5 mt-3 shadow-lg">
              <span>¡Error! {error}</span>
            </div>
          )}
          <form
            className="mt-10 flex flex-col gap-5"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <label
                className="flex items-center gap-1 font-bold text-primary-100"
                htmlFor="name"
              >
                Nombre de usuario
                <div className="group relative cursor-pointer">
                  <FaInfoCircle
                    className="text-gray-500 hover:text-gray-700"
                    size={16}
                  />
                  <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded bg-black px-3 py-2 text-sm text-white shadow-lg group-hover:block">
                    • No puede contener espacios
                    <br />
                    • Solo letras y números
                    <br />• Mínimo 5 caracteres
                  </div>
                </div>
              </label>
              <input
                className="rounded-lg border-b"
                type="text"
                id="name"
                placeholder="Tu nombre de usuario aquí"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-primary-100" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                className="rounded-lg border-b"
                type="email"
                id="email"
                placeholder="Tu correo aquí"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="flex items-center gap-1 font-bold text-primary-100"
                htmlFor="password"
              >
                Contraseña
                <div className="group relative cursor-pointer">
                  <FaInfoCircle
                    className="text-gray-500 hover:text-gray-700"
                    size={16}
                  />
                  <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded bg-black px-3 py-2 text-sm text-white shadow-lg group-hover:block">
                    • Debe tener entre 8 y 20 caracteres
                    <br />• No puede contener espaços
                  </div>
                </div>
              </label>
              <input
                className="rounded-lg border-b"
                type="password"
                id="password"
                placeholder="Tu contraseña aquí"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-2 pb-2">
              <label className="font-bold text-primary-100" htmlFor="confirmPassword">
                Confirmar Contraseña
              </label>
              <input
                className="rounded-lg border-b"
                type="password"
                id="confirmPassword"
                placeholder="Tu contraseña aquí"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </div>
            <LoadingButton
              loading={register.isPending}
              textColor="text-ct-blue-600"
              type="submit"
            >
              Registrarse
            </LoadingButton>
          </form>

          <Link href="/login">
            <div className="p-4  text-center text-primary-100">
              ¿Ya tienes una cuenta?
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RegisterSection;
