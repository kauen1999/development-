import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { EventMap } from "./EventMap";
import { eventMaps } from "../../data/maps";
import { trpc } from "@/utils/trpc";

interface Props {
  event: {
    id: string;
    name: string;
    image: string | null;
    sessions: {
      id: string;
      date: string;
      venueName: string;
    }[];
    ticketCategories: {
      id: string;
      title: string;
      price: number;
      seats: {
        id: string;
        label: string;
        row: string | null;
        number: number | null;
        status: "AVAILABLE" | "RESERVED" | "SOLD";
      }[];
    }[];
  };
}

type Seat = {
  sector: string;
  row: string;
  seat: number;
  price: number;
};

const BuyBody: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const disabled = selectedSeats.length === 0;

  const mapConfig = eventMaps["belgrano"];

  const handleSelect = (sector: string, row: string, seat: number, price: number) => {
    if (price === 0) return;

    const isAlreadySelected = selectedSeats.some(
      (s) => s.sector === sector && s.row === row && s.seat === seat
    );

    if (isAlreadySelected) {
      setSelectedSeats((prev) =>
        prev.filter((s) => !(s.sector === sector && s.row === row && s.seat === seat))
      );
    } else {
      if (selectedSeats.length >= 5) return;
      setSelectedSeats((prev) => [...prev, { sector, row, seat, price }]);
    }
  };

  const createOrder = trpc.order.create.useMutation({
    onSuccess: (order) => {
      router.push(`/checkout/${order.id}`);
    },
    onError: (error) => {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao criar o pedido. Tente novamente.");
    },
  });

  const handleBuy = () => {
    if (!termsAccepted) {
      alert("Você precisa aceitar os termos.");
      return;
    }

    if (selectedSeats.length === 0) {
      alert("Selecione pelo menos um assento.");
      return;
    }

    const selectedLabels = selectedSeats.map((s) => `${s.row}-${s.seat}`);
    const sessionId = event.sessions?.[0]?.id;

    if (!sessionId) {
      alert("Sessão não encontrada.");
      return;
    }

    createOrder.mutate({
      eventId: event.id,
      sessionId,
      selectedLabels,
    });
  };

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
                <div className="flex items-center justify-between">
                  <p>Setor: Platea {s.sector}</p>
                  <button className="rounded bg-gray-200 px-2 py-1 text-sm">1</button>
                </div>

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
          <>
            <div className="mt-4 pt-4">
              <h3 className="mb-4 text-lg font-semibold">Resumen de tu compra</h3>
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

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="accent-blue-600 focus:outline-none"
                />
                <span>
                  Acepto los{" "}
                  <a href="#" className="text-blue-600 underline">
                    términos y condiciones
                  </a>
                  .
                </span>
              </label>
            </div>

            <div className="mt-6">
              {disabled || !termsAccepted ? (
                <button
                  className="w-full cursor-not-allowed rounded-md bg-gray-300 py-3 px-6 font-semibold text-gray-600"
                  disabled
                >
                  Comprar ahora
                </button>
              ) : sessionData ? (
                <button
                  onClick={handleBuy}
                  className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white transition hover:bg-[#FF5F00]"
                >
                  Comprar ahora
                </button>
              ) : (
                <button
                  onClick={() => router.push("/login")}
                  className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white hover:bg-[#ff6c14]"
                >
                  Comprar ahora
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BuyBody;
