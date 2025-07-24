import React, { useState, useEffect, useCallback } from "react";
import type { NextPage, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import Header from "../components/principal/header/Header";
import Footer from "../components/principal/footer/Footer";
import Image from "next/image";
import { BiEdit } from "react-icons/bi";
import { MdDone, MdClose } from "react-icons/md";
import { getSession, useSession } from "next-auth/react";
import { trpc } from "../utils/trpc";

// Campos editáveis (igual backend)
type EditableField = "name" | "dniName" | "dni" | "phone" | "birthdate";
type EditState = Record<EditableField, boolean>;

const Profile: NextPage = () => {
  const { data: session, status } = useSession();

  // Modo edição
  const [edit, setEdit] = useState<EditState>({
    name: false,
    dniName: false,
    dni: false,
    phone: false,
    birthdate: false,
  });

  // Valores editáveis
  const [fields, setFields] = useState<Record<EditableField, string>>({
    name: "",
    dniName: "",
    dni: "",
    phone: "",
    birthdate: "",
  });

  const [URL, setURL] = useState<string | null>(null);

  // Busca dados do usuário
  const { data: user, isLoading, refetch } = trpc.auth.profile.useQuery(undefined, {
    enabled: !!session?.user?.id,
    onSuccess: (data) => {
      setFields({
        name: data?.name ?? "",
        dniName: data?.dniName ?? "",
        dni: data?.dni ?? "",
        phone: data?.phone ?? "",
        birthdate: data?.birthdate ? String(data.birthdate).slice(0, 10) : "",
      });
    },
  });

  // Mutation para atualizar perfil
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => refetch(),
  });

  // Função para salvar campo
  const handleSave = (field: EditableField) => {
    updateProfile.mutate({ [field]: fields[field] });
    setEdit((prev) => ({ ...prev, [field]: false }));
  };

  // Handler para editar/cancelar
  const handleEditButton = (field: EditableField, isEdit: boolean, currentValue: string) => {
    setEdit((prev) => ({ ...prev, [field]: isEdit }));
    if (isEdit) setFields((prev) => ({ ...prev, [field]: currentValue || "" }));
  };

  // Foto de perfil
  const cutURLProfileImage = useCallback(() => {
    const url: string | undefined | null = session?.user?.image;
    if (!url) return;
    if (url === "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png") {
      setURL(url);
    } else if (url.lastIndexOf("fbsbx") !== -1) {
      setURL(url);
    } else {
      const lastEqual = url.lastIndexOf("=");
      setURL(url.substring(0, lastEqual));
    }
  }, [session?.user?.image]);

  useEffect(() => {
    cutURLProfileImage();
  }, [cutURLProfileImage]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-[100vh] w-full items-center justify-center">
        <h1 className="text-2xl font-bold">Cargando...</h1>
      </div>
    );
  }

  return (
    <>
      <Header home={true} buyPage={undefined} />
      <div className="mt-6 flex w-full flex-col bg-gray-200 lg:flex-row">
        <div className="card rounded-box m-6 grid flex-grow place-items-center bg-white shadow-md">
          {URL && (
            <div className="m-6">
              <Image
                src={`${URL}`}
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
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Nombre de usuario
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.name ? (
                              <>
                                <span className="whitespace-nowrap">{fields.name}</span>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("name", true, fields.name)}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={fields.name}
                                  onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleSave("name")}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("name", false, fields.name)}
                                >
                                  <MdClose />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Nome no documento */}
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="dniName"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Nombre que figura en tu documento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.dniName ? (
                              <>
                                <span className="whitespace-nowrap">{fields.dniName}</span>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dniName", true, fields.dniName)}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={fields.dniName}
                                  onChange={e => setFields(f => ({ ...f, dniName: e.target.value }))}
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleSave("dniName")}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dniName", false, fields.dniName)}
                                >
                                  <MdClose />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Documento de identidade */}
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="dni"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Documento de identidad
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.dni ? (
                              <>
                                <span className="whitespace-nowrap">{fields.dni}</span>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dni", true, fields.dni)}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={fields.dni}
                                  onChange={e => setFields(f => ({ ...f, dni: e.target.value }))}
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleSave("dni")}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("dni", false, fields.dni)}
                                >
                                  <MdClose />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Telefone */}
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="phone"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Teléfono
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.phone ? (
                              <>
                                <span className="whitespace-nowrap">{fields.phone}</span>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("phone", true, fields.phone)}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={fields.phone}
                                  onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleSave("phone")}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("phone", false, fields.phone)}
                                >
                                  <MdClose />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Data de nascimento */}
                        <div className="col-span-6">
                          <label
                            htmlFor="birthdate"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Fecha de nacimiento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.birthdate ? (
                              <>
                                <span className="whitespace-nowrap">{fields.birthdate}</span>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("birthdate", true, fields.birthdate)}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="date"
                                  value={fields.birthdate}
                                  onChange={e => setFields(f => ({ ...f, birthdate: e.target.value }))}
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  type="button"
                                  onClick={() => handleSave("birthdate")}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  type="button"
                                  onClick={() => handleEditButton("birthdate", false, fields.birthdate)}
                                >
                                  <MdClose />
                                </button>
                              </>
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

// SSR seguro/tipado
export async function getServerSideProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Record<string, never>>> {
  const session = await getSession({ req: context.req });

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
