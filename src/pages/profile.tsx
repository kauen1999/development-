import React, { useState, useEffect, useRef, ReactNode } from "react";
import { type NextPage } from "next";
import Header from "../components/principal/header/Header";
import Footer from "../components/principal/footer/Footer";
import { BiEdit } from "react-icons/bi";
import { MdDone, MdClose } from "react-icons/md";
import { getSession, useSession } from "next-auth/react";
import Image from "next/image";
import { trpc, type RouterOutputs } from "../utils/trpc";

type User = RouterOutputs["auth"]["getUserById"];

interface EditInputs {
  username: boolean;
  DNIName: boolean;
  DNI: boolean;
  phone: boolean;
  birthdate: boolean;
}

interface CompleteData {
  name: string | null;
  DNIName: string;
  DNI: string;
  phone: string;
  birthdate: string;
}

const Profile: NextPage = () => {
  const { data: session, status } = useSession();

  const [URL, setURL] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditInputs>({
    username: false,
    DNIName: false,
    DNI: false,
    phone: false,
    birthdate: false,
  });
  const [userData, setUserData] = useState<User | null>(null);
  const [username, setUsername] = useState<User | null | undefined | string>(
    null
  );
  const [valueUsername, setValueUsername] = useState<
    User | string | null | undefined
  >(null);
  const [valueName, setValueName] = useState<User | string | null | undefined>(
    null
  );
  const [valueDNI, setValueDNI] = useState<User | string | null | undefined>(
    null
  );
  const [valuePhone, setValuePhone] = useState<
    User | string | null | undefined
  >(null);
  const [valueBirthdate, setValueBirthdate] = useState<
    User | string | null | undefined
  >(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: user,
    refetch: refetch,
    isLoading,
  } = trpc.auth.getUserById.useQuery(session?.user?.id, {
    enabled: session?.user?.id !== undefined,
    onSuccess: (data: User) => {
      if (!userData) setUserData(userData ?? data ?? null);
    },
  });

  const completeDataName = trpc.auth.modifyName.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const completeDataDNIName = trpc.auth.modifyDNIName.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const completeDataDNI = trpc.auth.modifyDNI.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const completeDataPhone = trpc.auth.modifyPhone.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const completeDataBirthdate = trpc.auth.modifyBirthdate.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const onSave = (typeValidation: string) => {
    console.log("ID:", session?.user?.id);
    console.log("valueUsername:", valueUsername);
    console.log("user?.name:", user?.name);
    if (typeValidation === "nameValidation") {
      try {
        if (session?.user?.id && valueUsername) {
          void completeDataName.mutate({
            id: session.user.id,
            name: valueUsername as string,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (typeValidation === "DNINameValidation") {
      try {
        if (session?.user?.id && valueName) {
          void completeDataDNIName.mutate({
            id: session.user.id,
            DNIName: valueName as string,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (typeValidation === "DNIValidation") {
      try {
        if (session?.user?.id && valueDNI) {
          void completeDataDNI.mutate({
            id: session.user.id,
            DNI: valueDNI as string,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (typeValidation === "PhoneValidation") {
      try {
        if (session?.user?.id && valuePhone) {
          void completeDataPhone.mutate({
            id: session.user.id,
            phone: valuePhone as string,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (typeValidation === "BirthdateValidation") {
      try {
        if (session?.user?.id && valueBirthdate) {
          void completeDataBirthdate.mutate({
            id: session.user.id,
            birthdate: valueBirthdate as string,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const facebookURLProfileHandler = (url: string | null | undefined) => {
    const newHeight = "height=1000";
    // const updatedUrl = url?.replace(/height=\d+/, newHeight);
    console.log(url);
    if (url) {
      setURL(url);
    }
  };
  const googleURLProfileHandler = (url: string | null | undefined) => {
    const lastEqual = url?.lastIndexOf("=");
    const cleanUrl = url?.substring(0, lastEqual);
    if (cleanUrl) {
      setURL(cleanUrl);
    }
  };

  const cutURLProfileImage = () => {
    const url: string | null | undefined = session?.user?.image;
    if (url) {
      if (
        url ===
        "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png"
      ) {
        setURL(url);
      }

      if (url.lastIndexOf("fbsbx") !== -1) {
        facebookURLProfileHandler(url);
      } else {
        googleURLProfileHandler(url);
      }
    }
  };

  const handleEditButton = (input: string) => {
    switch (input) {
      case "username": {
        setEdit({ ...edit, username: !edit.username });
        break;
      }
      case "DNI": {
        setEdit({ ...edit, DNI: !edit.DNI });
        break;
      }
      case "DNIName": {
        setEdit({ ...edit, DNIName: !edit.DNIName });
        break;
      }
      case "phone": {
        setEdit({ ...edit, phone: !edit.phone });
        break;
      }
      case "birthdate": {
        setEdit({ ...edit, birthdate: !edit.birthdate });
        break;
      }
      default: {
        break;
      }
    }
  };

  useEffect(() => {
    cutURLProfileImage();
    setUsername(userData?.name);
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
      <Header home={true} />
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
                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="first-name"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Nombre de usuario
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.username ? (
                              <>
                                <span className="whitespace-nowrap">
                                  {isLoading ? (
                                    <>Cargando...</>
                                  ) : (
                                    <>{user?.name}</>
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  placeholder="Nombre de usuario"
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                  value={valueUsername as string}
                                  onChange={(e) => {
                                    setValueUsername(e.currentTarget.value);
                                  }}
                                  required
                                  ref={inputRef}
                                />
                              </>
                            )}
                            {edit.username ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("username");
                                    onSave("nameValidation");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("username");
                                  }}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("username");
                                    setValueUsername(user?.name);
                                  }}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="last-name"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Nombre que figura en tu documento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.DNIName ? (
                              <>
                                <span className="whitespace-nowrap">
                                  {isLoading ? (
                                    <>Cargando...</>
                                  ) : (
                                    <>{user?.DNIName}</>
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  placeholder="Nombre de usuario"
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                  value={valueName as string}
                                  onChange={(e) => {
                                    setValueName(e.currentTarget.value);
                                  }}
                                  required
                                  ref={inputRef}
                                />
                              </>
                            )}
                            {edit.DNIName ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNIName");
                                    onSave("DNINameValidation");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNIName");
                                  }}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNIName");
                                    setValueName(user?.DNIName);
                                  }}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="email-address"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Documento de identidad
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.DNI ? (
                              <>
                                <span className="whitespace-nowrap">
                                  {isLoading ? (
                                    <>Cargando...</>
                                  ) : (
                                    <>{user?.DNI}</>
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  id="number"
                                  name="number"
                                  placeholder="Nombre de usuario"
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                  value={valueDNI as string}
                                  onChange={(e) => {
                                    setValueDNI(e.currentTarget.value);
                                  }}
                                  required
                                  ref={inputRef}
                                />
                              </>
                            )}
                            {edit.DNI ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNI");
                                    onSave("DNIValidation");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNI");
                                  }}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("DNI");
                                    setValueDNI(user?.DNI);
                                  }}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label
                            htmlFor="email-address"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Teléfono
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.phone ? (
                              <>
                                <span className="whitespace-nowrap">
                                  {isLoading ? (
                                    <>Cargando...</>
                                  ) : (
                                    <>{user?.phone}</>
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  id="number"
                                  name="number"
                                  placeholder="Nombre de usuario"
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                  value={valuePhone as string}
                                  onChange={(e) => {
                                    setValuePhone(e.currentTarget.value);
                                  }}
                                  required
                                  ref={inputRef}
                                />
                              </>
                            )}
                            {edit.phone ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("phone");
                                    onSave("PhoneValidation");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("phone");
                                  }}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("phone");
                                    setValuePhone(user?.phone);
                                  }}
                                >
                                  <BiEdit />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="col-span-6">
                          <label
                            htmlFor="street-address"
                            className="block text-sm font-medium leading-6 text-gray-900"
                          >
                            Fecha de nacimiento
                          </label>
                          <div className="flex items-center justify-between">
                            {!edit.birthdate ? (
                              <>
                                <span className="whitespace-nowrap">
                                  {isLoading ? (
                                    <>Cargando...</>
                                  ) : (
                                    <>{user?.birthdate}</>
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="date"
                                  name="date"
                                  id="date"
                                  placeholder="Nombre de usuario"
                                  className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                  value={valueBirthdate as string}
                                  onChange={(e) => {
                                    setValueBirthdate(e.currentTarget.value);
                                  }}
                                  required
                                  ref={inputRef}
                                />
                              </>
                            )}
                            {edit.birthdate ? (
                              <>
                                <button
                                  className="btn-success btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("birthdate");
                                    onSave("BirthdateValidation");
                                  }}
                                >
                                  <MdDone />
                                </button>
                                <button
                                  className="btn-error btn cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("birthdate");
                                  }}
                                >
                                  <MdClose />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-warning btn m-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditButton("birthdate");
                                    setValueBirthdate(user?.birthdate);
                                  }}
                                >
                                  <BiEdit />
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
    props: {},
  };
}
