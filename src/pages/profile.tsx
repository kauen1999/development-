import React, { useState, useEffect } from "react";
import type { NextPage, GetServerSideProps } from "next";
import Header from "../components/principal/header/Header";
import Footer from "../components/principal/footer/Footer";
import { BiEdit } from "react-icons/bi";
import { MdDone, MdClose } from "react-icons/md";
import { getSession, useSession } from "next-auth/react";
import Image from "next/image";
import { trpc } from "../utils/trpc";

// Utilitário para garantir string nunca undefined/null
const safeStr = (v: string | null | undefined) => v ?? "";

// Utilitário para formatar data yyyy-MM-dd para input type date
function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "";
  try {
    const date = typeof input === "string" ? new Date(input) : input;
    if (isNaN(date.getTime())) return ""; // Data inválida tratada aqui
    return date.toISOString().split("T")[0] as string;
  } catch {
    return "";
  }
}

interface EditInputs {
  username: boolean;
  dniName: boolean;
  dni: boolean;
  phone: boolean;
  birthdate: boolean;
}

const Profile: NextPage = () => {
  const { data: session, status } = useSession();

  // Estados para controlar edição
  const [edit, setEdit] = useState<EditInputs>({
    username: false,
    dniName: false,
    dni: false,
    phone: false,
    birthdate: false,
  });

  // Estados dos inputs controlados
  const [valueUsername, setValueUsername] = useState("");
  const [valueDniName, setValueDniName] = useState("");
  const [valueDni, setValueDni] = useState("");
  const [valuePhone, setValuePhone] = useState("");
  const [valueBirthdate, setValueBirthdate] = useState("");

  // URL da imagem de perfil
  const [URL, setURL] = useState<string>("/imagens/perfil-de-usuario.webp");

  // Obter userId do session (string vazia se não logado)
  const userId: string | undefined = session?.user?.id;

  // Query TRPC para buscar dados do usuário
  const { data: user, isLoading, refetch } = trpc.auth.getUserById.useQuery(userId ?? "", {
  enabled: !!userId, // só executa a query se userId existir
  onSuccess: (data) => {
      setValueUsername(safeStr(data.name));
      setValueDniName(safeStr(data.dniName));
      setValueDni(safeStr(data.dni));
      setValuePhone(safeStr(data.phone));
      setValueBirthdate(formatDate(data.birthdate));
      setURL(data.image ?? "/imagens/perfil-de-usuario.webp");
    },
  });

  // Mutações TRPC para atualizar campos (ajuste nomes conforme backend)
  const completeDataName = trpc.auth.modifyName.useMutation({
    onSuccess: () => { void refetch(); },
  });
  const completeDataDniName = trpc.auth.modifydniName.useMutation({
    onSuccess: () => { void refetch(); },
  });
  const completeDataDni = trpc.auth.modifydni.useMutation({
    onSuccess: () => { void refetch(); },
  });
  const completeDataPhone = trpc.auth.modifyPhone.useMutation({
    onSuccess: () => { void refetch(); },
  });
  const completeDataBirthdate = trpc.auth.modifyBirthdate.useMutation({
    onSuccess: () => { void refetch(); },
  });

  // Função salvar edição
  function onSave(field: keyof EditInputs) {
    if (!session?.user?.id) return;
    switch (field) {
      case "username":
        if (valueUsername.trim()) completeDataName.mutate({ id: session.user.id, name: valueUsername.trim() });
        break;
      case "dniName":
        if (valueDniName.trim()) completeDataDniName.mutate({ id: session.user.id, dniName: valueDniName.trim() });
        break;
      case "dni":
        if (valueDni.trim()) completeDataDni.mutate({ id: session.user.id, dni: valueDni.trim() });
        break;
      case "phone":
        if (valuePhone.trim()) completeDataPhone.mutate({ id: session.user.id, phone: valuePhone.trim() });
        break;
      case "birthdate":
        if (valueBirthdate) completeDataBirthdate.mutate({ id: session.user.id, birthdate: valueBirthdate });
        break;
    }
    setEdit((prev) => ({ ...prev, [field]: false }));
  }

  // Função para alternar modo de edição e resetar valores
  function handleEditButton(field: keyof EditInputs) {
    setEdit((prev) => {
      const newState = { ...prev, [field]: !prev[field] };
      // Se abrindo edição, resetar o valor do campo para valor atual do usuário
      if (!prev[field] && user) {
        switch (field) {
          case "username":
            setValueUsername(safeStr(user.name));
            break;
          case "dniName":
            setValueDniName(safeStr(user.dniName));
            break;
          case "dni":
            setValueDni(safeStr(user.dni));
            break;
          case "phone":
            setValuePhone(safeStr(user.phone));
            break;
          case "birthdate":
            setValueBirthdate(formatDate(user.birthdate));
            break;
        }
      }
      return newState;
    });
  }

  // Atualiza URL da imagem quando sessão muda
  useEffect(() => {
    const image = session?.user?.image;
    setURL(typeof image === "string" ? image : "/imagens/perfil-de-usuario.webp");
  }, [session?.user?.image]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-[100vh] w-full items-center justify-center">
        <h1 className="text-2xl font-bold">Cargando...</h1>
      </div>
    );
  }

  // HTML e CSS idênticos, apenas tipagem e lógica ajustadas
  return (
    <>
      <Header home buyPage={false} />
      <div className="mt-6 flex w-full flex-col bg-gray-200 lg:flex-row">
        <div className="card rounded-box m-6 grid flex-grow place-items-center bg-white shadow-md">
          {URL && (
            <div className="m-6">
              <Image
                src={URL ?? "/imagens/perfil-de-usuario.webp"}
                alt="imagen de perfil"
                width={300}
                height={300}
                className="rounded-lg"
                priority
              />
            </div>
          )}
          <div className="mb-9">
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p>{user?.email}</p>
          </div>
        </div>
        <div className="card mb-6 flex flex-col bg-white shadow-md sm:m-6 md:w-full md:w-[70%]">
          <div className="px-9 pt-9 md:pb-9">
            <h4 className="text-2xl font-bold">Mi cuenta</h4>
            <p>Modifica tus datos personales y de contacto.</p>
          </div>
          <div className="mt-10 sm:mt-0">
            <div className="md:grid md:grid-cols-1 md:gap-6">
              <div className="mt-5 md:col-span-2 md:mt-0">
                <form action="#" method="POST">
                  <div className="overflow-hidden shadow sm:rounded-md">
                    <div className="bg-white px-4 py-5 sm:p-6">
                      <div className="grid grid-cols-6 gap-6">
                        {/* Nome de usuário */}
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Nombre de usuario
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.username ? (
                              <span className="whitespace-nowrap">
                                {isLoading ? <>Cargando...</> : <>{user?.name}</>}
                              </span>
                            ) : (
                              <input
                                type="text"
                                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={valueUsername}
                                onChange={(e) => setValueUsername(e.target.value ?? "")}
                                required
                              />
                            )}
                            {edit.username ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => {
                                    handleEditButton("username");
                                    onSave("username");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("username")}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-warning btn m-2 cursor-pointer"
                                type="button"
                                onClick={() => handleEditButton("username")}
                              >
                                <BiEdit />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nome documento */}
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Nombre que figura en tu documento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.dniName ? (
                              <span className="whitespace-nowrap">
                                {isLoading ? <>Cargando...</> : <>{user?.dniName}</>}
                              </span>
                            ) : (
                              <input
                                type="text"
                                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={valueDniName}
                                onChange={(e) => setValueDniName(e.target.value ?? "")}
                                required
                              />
                            )}
                            {edit.dniName ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => {
                                    handleEditButton("dniName");
                                    onSave("dniName");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dniName")}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-warning btn m-2 cursor-pointer"
                                type="button"
                                onClick={() => handleEditButton("dniName")}
                              >
                                <BiEdit />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Documento */}
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Documento de identidad
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.dni ? (
                              <span className="whitespace-nowrap">
                                {isLoading ? <>Cargando...</> : <>{user?.dni}</>}
                              </span>
                            ) : (
                              <input
                                type="text"
                                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={valueDni}
                                onChange={(e) => setValueDni(e.target.value ?? "")}
                                required
                              />
                            )}
                            {edit.dni ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => {
                                    handleEditButton("dni");
                                    onSave("dni");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dni")}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-warning btn m-2 cursor-pointer"
                                type="button"
                                onClick={() => handleEditButton("dni")}
                              >
                                <BiEdit />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Telefone */}
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Teléfono
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.phone ? (
                              <span className="whitespace-nowrap">
                                {isLoading ? <>Cargando...</> : <>{user?.phone}</>}
                              </span>
                            ) : (
                              <input
                                type="text"
                                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={valuePhone}
                                onChange={(e) => setValuePhone(e.target.value ?? "")}
                                required
                              />
                            )}
                            {edit.phone ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => {
                                    handleEditButton("phone");
                                    onSave("phone");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("phone")}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-warning btn m-2 cursor-pointer"
                                type="button"
                                onClick={() => handleEditButton("phone")}
                              >
                                <BiEdit />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Data nascimento */}
                        <div className="col-span-6">
                          <label className="block text-sm font-medium leading-6 text-gray-900">
                            Fecha de nacimiento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.birthdate ? (
                              <span className="whitespace-nowrap">
                                {isLoading ? (
                                  <>Cargando...</>
                                ) : user?.birthdate ? (
                                  new Date(user.birthdate).toLocaleDateString()
                                ) : (
                                  ""
                                )}
                              </span>
                            ) : (
                              <input
                                type="date"
                                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                value={valueBirthdate}
                                onChange={(e) => setValueBirthdate(e.target.value ?? "")}
                                required
                              />
                            )}
                            {edit.birthdate ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => {
                                    handleEditButton("birthdate");
                                    onSave("birthdate");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("birthdate")}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn-warning btn m-2 cursor-pointer"
                                type="button"
                                onClick={() => handleEditButton("birthdate")}
                              >
                                <BiEdit />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card rounded-box grid h-[30vh] place-items-center bg-white">
        No hay eventos recientes
      </div>
      <Footer />
    </>
  );
};

export default Profile;

// SSR Auth
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession({ req: context.req });
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return { props: {} };
};
