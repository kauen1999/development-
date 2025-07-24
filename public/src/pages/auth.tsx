
import React, { useState } from "react";
import { type NextPage } from "next";
import { type GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { trpc } from "../utils/trpc";
import { getSession, useSession } from "next-auth/react";

interface CompleteData {
  name: string;
  dniName: string;
  dni: string;
  phone: string;
  birthdate: string;
}

const Auth: NextPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [finishRegister, setFinishRegister] = useState(false);
  const [name, setName] = useState<string>("");
  const [dniName, setdniName] = useState<string>("");
  const [dni, setdni] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [birthdate, setBirthdate] = useState<string>("");
  const [validationErrorAlert, setValidationErrorAlert] =
    useState<boolean>(false);

  const redirectInitialPath = () => {
    router.push("/");
  };

  const completeData = trpc.auth.updateProfile.useMutation({
  onSuccess: () => {
    void redirectInitialPath();
    },
  });

  const onSave = ({
    name,
    dniName,
    dni,
    phone,
    birthdate,
  }: CompleteData): void => {
    try {
      if (session?.user?.id) {
        void completeData.mutate({
          name,
          dniName: dniName,
          dni: dni,
          phone,
          birthdate,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleFormValidation = ({
    name,
    dniName,
    dni,
    phone,
    birthdate,
  }: CompleteData): void => {
    if (
      name !== "" &&
      dniName !== "" &&
      dni !== "" &&
      phone !== "" &&
      birthdate !== ""
    ) {
      onSave({
        name,
        dniName,
        dni,
        phone,
        birthdate,
      });
    } else {
      setValidationErrorAlert(true);
    }
  };

  const createNotification = trpc.notification.createNotification.useMutation();
  const createNotificationHandler = () => {
    if (session?.user?.id) {
      void createNotification.mutate({
        title: "¡Acabas de crear tu cuenta con exito!",
        description: "Encuentra tus eventos favoritos",
      });
    }
  };

  return (
    <div>
      <div
        className="hero h-[100vh]"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1")`,
        }}
      >
        <div className="hero-overlay bg-black bg-opacity-60"></div>
        <div className="hero-content text-center text-neutral-content">
          <div className="max-w-lg">
            {finishRegister && (
              <h1 className="mb-5 text-4xl font-bold">
                Completa tu información
              </h1>
            )}
            {!finishRegister && (
              <>
                <h1 className="mb-5 text-4xl font-bold">
                  ¡No esperes más, adquiere tus entradas hoy!
                </h1>
                <p className="mb-5">
                  Al utilizar nuestros servicios, usted acepta y reconoce haber
                  leído y entendido nuestros términos y condiciones
                </p>
                <button
                  className="btn-warning btn"
                  onClick={() => setFinishRegister(true)}
                >
                  Empieza Ahora
                </button>
              </>
            )}

            {finishRegister && (
              <>
                <div className="card w-full flex-shrink-0 bg-base-100 shadow-2xl">
                  <div className="card-body">
                    {validationErrorAlert ? (
                      <div className="alert alert-error shadow-lg">
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
                          <span>¡Error! Rellena los datos faltantes</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Nombre de usuario</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre de usuario"
                        className="input-bordered input text-black"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        required={true}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Nombre completo</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        className="input-bordered input text-black"
                        value={dniName}
                        onChange={(e) => setdniName(e.currentTarget.value)}
                        required={true}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">dni</span>
                      </label>
                      <input
                        type="number"
                        id="number"
                        name="number"
                        placeholder="ID Documento de identidad"
                        className="input-bordered input text-black"
                        value={dni}
                        onChange={(e) => setdni(e.currentTarget.value)}
                        required={true}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Teléfono</span>
                      </label>
                      <input
                        type="number"
                        id="number"
                        name="number"
                        placeholder="Numero de teléfono"
                        className=" input-bordered input text-black"
                        value={phone}
                        onChange={(e) => setPhone(e.currentTarget.value)}
                        required={true}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Fecha de nacimiento</span>
                      </label>
                      <input
                        type="date"
                        name="date"
                        id="date"
                        placeholder="Fecha de nacimiento"
                        className="input-bordered input text-black"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.currentTarget.value)}
                        required={true}
                      />
                    </div>
                    <div className="form-control mt-6">
                      <button
                        className="btn-warning btn"
                        onClick={() => {
                          handleFormValidation({
                            name,
                            dniName,
                            dni,
                            phone,
                            birthdate,
                          });
                          createNotificationHandler();
                        }}
                      >
                        Finalizar registro
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession({ req: context.req });
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: { session },
  };
}
