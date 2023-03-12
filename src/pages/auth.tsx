import React, { useState } from "react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { trpc, type RouterOutputs } from "../utils/trpc";
import { getSession } from "next-auth/react";

interface CompleteData {
  DNIName: string;
  DNI: string;
  phone: string;
  birthdate: string;
}

const Auth: NextPage = () => {
  const router = useRouter();

  const [finishRegister, setFinishRegister] = useState(false);
  const [DNIName, setDNIName] = useState<string>("");
  const [DNI, setDNI] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [birthdate, setBirthdate] = useState<string>("");

  const redirectInitialPath = () => {
    router.push("/");
  };

  const completeData = trpc.auth.modify.useMutation({
    onSuccess: () => {
      void redirectInitialPath();
    },
  });

  const onSave = ({ DNIName, DNI, phone, birthdate }: CompleteData) => {
    void completeData.mutate({
      DNIName,
      DNI,
      phone,
      birthdate,
    });
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
          <div className="max-w-md">
            <h1 className="mb-5 text-4xl font-bold">
              ¡No esperes más, adquiere tus entradas hoy!
            </h1>

            {!finishRegister && (
              <>
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
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Nombre de documento</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre de documento"
                        className="input-bordered input text-black"
                        value={DNIName}
                        onChange={(e) => setDNIName(e.currentTarget.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">DNI</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ID Documento de identidad"
                        className="input-bordered input text-black"
                        value={DNI}
                        onChange={(e) => setDNI(e.currentTarget.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Teléfono</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Numero de teléfono"
                        className="input-bordered input text-black"
                        value={phone}
                        onChange={(e) => setPhone(e.currentTarget.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Fecha de nacimiento</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Fecha de nacimiento"
                        className="input-bordered input text-black"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.currentTarget.value)}
                        required
                      />
                    </div>
                    <div className="form-control mt-6">
                      <button
                        className="btn-warning btn"
                        onClick={() => {
                          onSave({
                            DNIName,
                            DNI,
                            phone,
                            birthdate,
                          });
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

export async function getServerSideProps({ req }: any) {
  const session = await getSession({ req });

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
