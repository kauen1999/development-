import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { useFormik } from "formik";
import { registerValidate } from "../../../lib/validate";
import { trpc } from "../../../utils/trpc";
import { useRouter } from "next/router";
import { LoadingButton } from "../loader/LoadingButton";
import { CreateUserInput } from "../../../server/schema/user.schema";

const RegisterSection: React.FC = () => {
  const router = useRouter();

  const [validationErrorAlert, setValidationErrorAlert] =
    useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
      cpassword: "",
    },
    validate: registerValidate,
    onSubmit,
  });

  async function onSubmit(values: CreateUserInput) {
    // SignUpUser(values);
  }

  const { mutate: SignUpUser, isLoading } = trpc.auth.registerUser.useMutation({
    onSuccess(data) {
      router.push("/login");
    },
    onError(error) {
      setError(error.message);
      setValidationErrorAlert(true);
    },
  });

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
            Registro
          </h2>

          {validationErrorAlert ? (
            <div className="alert alert-error -mb-5 mt-3 shadow-lg">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 flex-shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>¡Error! {error}</span>
              </div>
            </div>
          ) : null}

          <form
            className="mt-10 flex flex-col gap-5"
            onSubmit={formik.handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <label className="font-bold text-primary-100" htmlFor="correo">
                Nombre de usuario
              </label>
              <input
                className="rounded-lg border-b"
                type="text"
                id="name"
                placeholder="Tu nombre de usuario aquí"
                {...formik.getFieldProps("name")}
              />
              {formik.errors.name && formik.touched.name ? (
                <span className="-my-2 text-red-500">{formik.errors.name}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-primary-100" htmlFor="correo">
                Correo Electrónico
              </label>
              <input
                className="rounded-lg border-b"
                type="email"
                id="email"
                placeholder="Tu correo aquí"
                {...formik.getFieldProps("email")}
              />
              {formik.errors.email && formik.touched.email ? (
                <span className="-my-2 text-red-500">
                  {formik.errors.email}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="font-bold text-primary-100 "
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
              />
              {formik.errors.password && formik.touched.password ? (
                <span className="-my-2 text-red-500">
                  {formik.errors.password}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="font-bold text-primary-100 "
                htmlFor="contrasena"
              >
                Confirmar Contraseña
              </label>

              <input
                className="rounded-lg border-b"
                type="password"
                id="cpassword"
                placeholder="Tu contraseña aquí"
                {...formik.getFieldProps("cpassword")}
              />
              {formik.errors.cpassword && formik.touched.cpassword ? (
                <span className="-my-2 text-red-500">
                  {formik.errors.cpassword}
                </span>
              ) : null}
            </div>

            <LoadingButton loading={isLoading} textColor="text-ct-blue-600">
              Registrarse
            </LoadingButton>
          </form>
          <div className="flex flex-col p-9 "></div>
          <Link href="/login">
            <div className="text-center text-primary-100">
              ¿Ya tienes una cuenta?
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RegisterSection;
