// src/components/BuyBody/BuyBody.tsx
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { EventMap } from "./EventMap";
import { eventMaps } from "../../data/maps";

interface Props {
  foto: string;
  titulo: string;
}

type Seat = {
  sector: string;
  row: number;
  seat: number;
  price: number;
};

const BuyBody: React.FC<Props> = ({ foto, titulo }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSelect = (
    sector: string,
    row: number,
    seat: number,
    price: number
  ) => {
    const isAlreadySelected = selectedSeats.some(
      (s) => s.sector === sector && s.row === row && s.seat === seat
    );

    if (isAlreadySelected) {
      // Se já está selecionado, remova normalmente
      setSelectedSeats((prev) =>
        prev.filter(
          (s) => !(s.sector === sector && s.row === row && s.seat === seat)
        )
      );
    } else {
      // Se já tem 5 selecionados, não permite mais
      if (selectedSeats.length >= 5) return;

      setSelectedSeats((prev) => [...prev, { sector, row, seat, price }]);
    }
  };

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const totalTickets = selectedSeats.length;
  const disabled = totalTickets === 0;

  const location = (router.query.location as string) || "belgrano";
  const mapConfig = eventMaps[location];

  if (!mapConfig) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-gray-500">Mapa do evento não encontrado.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto my-4 flex max-w-[1200px] flex-col gap-8 rounded-lg border border-gray-300 bg-white p-6 shadow-lg lg:flex-row">
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <EventMap
          mapConfig={mapConfig}
          onSelect={handleSelect}
          selectedSeats={selectedSeats}
          maxReached={selectedSeats.length >= 5}
        />
      </div>
      <div className="w-full lg:w-1/2">
        <h2 className="w-fit rounded bg-gray-400 px-4 py-2 text-sm font-bold text-white">
          DOM-06/JUL
        </h2>

        {selectedSeats.length > 0 ? (
          <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-2">
            {selectedSeats.map((s, i) => (
              <div key={i} className="border-b pb-2">
                {/* Linha 1 */}
                <div className="flex items-center justify-between">
                  <p>Setor: Platea {s.sector}</p>
                  <button className="rounded bg-gray-200 px-2 py-1 text-sm">
                    1
                  </button>{" "}
                  {/* ou ícone de remover/editar */}
                </div>

                {/* Linha 2 */}
                <div className="flex items-center justify-between">
                  <p>
                    Fila: {s.sector}
                    {s.row} - Assento {s.seat}
                  </p>
                  <p className="font-semibold">$ {s.price}.00</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-600">Selecione ao menos um assento</p>
        )}

        {selectedSeats.length > 0 && (
          <div className="mt-4 pt-4">
            <h3 className="mb-4 text-lg font-semibold"> Resumen de tu compra</h3>
            {selectedSeats.map((s, i) => (
              <div className="flex justify-between text-sm" key={i}>
                <span>
                  Platea {s.sector}
                  {s.row} - {s.seat}
                </span>
                <span>$ {s.price}.00</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between font-bold">
              <span>Total de la compra</span>
              <span>$ {totalPrice}.00</span>
            </div>
          </div>
        )}
        {selectedSeats.length > 0 && (
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="accent-blue-600 focus:outline-none"
              />
              <span>
                 Acepto los {" "}
                <a href="#" className="text-blue-600 underline">
                  términos y condiciones
                </a>
                .
              </span>
            </label>
          </div>
        )}
        {selectedSeats.length > 0 && (
          <div className="mt-6">
            {disabled || !termsAccepted ? (
              <button
                className="w-full cursor-not-allowed rounded-md bg-gray-300 py-3 px-6 font-semibold text-gray-600"
                disabled
              >
                Comprar ahora
              </button>
            ) : sessionData ? (
              <Link
                href={{
                  pathname: "../checkout/[id]",
                  query: {
                    id: "01",
                    title: titulo,
                    price: totalPrice,
                    cant: totalTickets,
                    picture: foto,
                    details: JSON.stringify(selectedSeats),
                  },
                }}
              >
                <button className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white transition hover:bg-[#FF5F00]">
                  Comprar ahora
                </button>
              </Link>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white hover:bg-[#ff6c14]"
              >
                Comprar ahora
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyBody;