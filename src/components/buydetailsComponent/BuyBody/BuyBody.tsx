import { useSession } from "next-auth/react";
import { StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { GoSettings } from "react-icons/go";
import BelgranoMap from "../../maps/BelgranoMap";
import LunaParkMap from "../../maps/LunaParkMap";
import Asientos from "./Asientos";
import SeccionCampo from "./SeccionCampo";
import { useUserType } from "../../principal/login/UserTypeContext";

interface Props {
  foto: StaticImageData;
  titulo: string;
}

const BuyBody = ({ foto, titulo }: Props) => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [disable, setDisable] = useState(false);

  const [open, setOpen] = useState(false);
  const [activeA, setActiveA] = useState(false);
  const [activeB, setActiveB] = useState(false);
  const [activeC, setActiveC] = useState(false);
  const [activePullman, setActivePullman] = useState(false);
  const [cant, setCant] = useState("1");
  const [price, setPrice] = useState<number>(0);
  const [sector, setSector] = useState<string>("");
  const trigger = () => {
    setOpen(!open);
  };

  const { userType } = useUserType();

  const disabled =
    activeA || activeB || activeC || activePullman ? false : true;

  return (
    <div className="border-b border-gray-200">
      <div className="container mx-auto w-[100%] lg:flex">
        <div className="mt-10 flex w-full items-center justify-center">
          <BelgranoMap
            activeA={activeA}
            setActiveA={setActiveA}
            activeB={activeB}
            setActiveB={setActiveB}
            activeC={activeC}
            setActiveC={setActiveC}
            activePullman={activePullman}
            setActivePullman={setActivePullman}
            setPrice={setPrice}
            setSector={setSector}
          />
        </div>
        <div className="divider lg:divider-horizontal"></div>
        <div className="m-auto w-[70%] py-9">
          <div className="flex justify-center gap-3">
            <select
              name="boleto"
              id="boleto"
              className="rounded-lg border-2 border-slate-400 p-2 pr-20"
              value={`${cant}`}
              onChange={(e) => {
                setCant(e.target.value);
              }}
            >
              <option value={"1"}>1 Boleto</option>
              <option value={"2"}>2 Boletos</option>
              <option value={"3"}>3 Boletos</option>
              <option value={"4"}>4 Boletos</option>
              <option value={"5"}>5 Boletos</option>
            </select>

            {/* <button className="flex items-center gap-1 rounded  border-2 border-slate-400 bg-white px-3">
              <GoSettings />
              Filtros
            </button> */}
          </div>

          <div className="mt-10 flex place-content-between place-items-center">
            <p className="cursor-pointer text-xl">Sector</p>
            <p className="cursor-pointer text-xl">Precio</p>
          </div>
          <div className="mt-5 flex flex-col ">
            <SeccionCampo
              seccion={"Platea A"}
              precio={15000}
              butacas={"Butacas"}
              cant={cant}
              active={activeA}
              setActive={setActiveA}
              setSector={setSector}
              setPrice={setPrice}
              disable={disable}
            />
            <SeccionCampo
              seccion={"Platea B"}
              precio={12000}
              butacas={"Butacas"}
              cant={cant}
              active={activeB}
              setActive={setActiveB}
              setSector={setSector}
              setPrice={setPrice}
              disable={disable}
            />
            <SeccionCampo
              seccion={"Platea C"}
              precio={10000}
              butacas={"Butacas"}
              cant={cant}
              active={activeC}
              setActive={setActiveC}
              setSector={setSector}
              setPrice={setPrice}
              disable={disable}
            />
            <SeccionCampo
              seccion={"Pullman"}
              precio={7000}
              butacas={"Butacas"}
              cant={cant}
              active={activePullman}
              setActive={setActivePullman}
              setSector={setSector}
              setPrice={setPrice}
              disable={disable}
            />
          </div>
          <div className="mt-9 flex items-center justify-center">
            {!sessionData ? (
              <>
                {disabled ? (
                  <button className="btn-warning btn" disabled={disabled}>
                    <span className="">CONFIRMAR</span>
                  </button>
                ) : (
                  <button
                    className="btn-warning btn"
                    disabled={disabled}
                    onClick={() => {
                      if (!sessionData) router.push("/login");
                    }}
                  >
                    <span className="">CONFIRMAR</span>
                  </button>
                )}
              </>
            ) : null}

            {sessionData ? (
              <>
                {disabled ? (
                  <button className="btn-warning btn" disabled={disabled}>
                    <span className="">CONFIRMAR</span>
                  </button>
                ) : (
                  <Link
                    onClick={() => {
                      if (!sessionData) router.push("/login");
                    }}
                    href={{
                      pathname: "../checkout/[id]",
                      query: {
                        id: "01",
                        title: titulo,
                        price: price * Number(cant),
                        sector: sector,
                        cant: cant,
                        picture: foto as any,
                      },
                    }}
                  >
                    <button className="btn-warning btn" disabled={disabled}>
                      <span className="">CONFIRMAR</span>
                    </button>
                  </Link>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyBody;
