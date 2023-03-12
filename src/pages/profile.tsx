import React, { useState, useEffect, useRef } from "react";
import Header from "../components/principal/header/Header";
import Footer from "../components/principal/footer/Footer";
import { BiEdit } from "react-icons/bi";
import { getSession, useSession } from "next-auth/react";
import Image from "next/image";

const Profile = () => {
  const { data: session } = useSession();

  const [URL, setURL] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Rick");
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      if (url.lastIndexOf("fbsbx") !== -1) {
        facebookURLProfileHandler(url);
      } else {
        googleURLProfileHandler(url);
      }
    }
  };

  useEffect(() => {
    cutURLProfileImage();
  }, [cutURLProfileImage]);

  return (
    <>
      <Header />
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
            <h1 className="text-2xl font-bold">Nombre de usuario</h1>
            <p>Correo Electronico</p>
          </div>
        </div>
        <div className="card mb-6 flex w-full flex-col bg-white shadow-md sm:m-6 sm:w-[70%]">
          <div className="px-9 pt-9">
            <h4 className="text-2xl font-bold">Mi cuenta</h4>
            <p>Modifica tus datos personales y de contacto.</p>
          </div>
          <div className="divider"></div>

          <div className="mb-9 flex h-full flex-col items-center justify-center">
            <div className="px-9 sm:flex">
              <div className="form-control max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">
                    Nombre de usuario
                  </span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                    ref={inputRef}
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
              </div>
              <div className="form-control max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">DNI</span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">
                    Nombre que figura en tu documento
                  </span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-9 sm:flex">
              <div className="form-control max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">
                    What is your name?
                  </span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
              </div>
              <div className="form-control max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">
                    What is your name?
                  </span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
              </div>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text font-bold">
                    What is your name?
                  </span>
                </label>
                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input-ghost input w-full max-w-xs"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                  />
                  <button
                    className="btn-warning btn m-2 cursor-pointer"
                    onClick={() => {
                      inputRef?.current?.focus();
                    }}
                  >
                    <BiEdit />
                  </button>
                </div>
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
