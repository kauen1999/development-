// src/components/buydetailsComponent/BuyBody/BuyBody.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import { EventMap } from "../../BuyBody/EventMap";
import { eventMaps } from "../../../data/maps";
import { trpc } from "@/utils/trpc";
import type { EventMapConfig } from "@/data/maps";

interface Props {
  event: {
    eventSessions: {
      id: string;
      date: string;
      venueName: string;
    }[];
    id: string;
    name: string;
    date: string;
    image: string | null;
    city: string;
    venueName: string;
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
    category: {
      id: string;
      name: string;
    };
  };
}

type Seat = {
  sector: string;
  row: string;
  seat: number;
  price: number;
};

type CreatedOrder = { id: string };

const mergeMapWithTicketPrices = (
  mapConfig: EventMapConfig,
  ticketCategories: Props["event"]["ticketCategories"]
): EventMapConfig => {
  const newSectors = mapConfig.sectors.map((sector) => {
    const ticketCategory = ticketCategories.find(
      (tc) => tc.title.toLowerCase() === sector.name.toLowerCase()
    );
    const price = ticketCategory?.price ?? 0;
    const newPricesByRow = Object.fromEntries(sector.rows.map((row) => [row, price]));
    return { ...sector, pricesByRow: newPricesByRow };
  });

  return { ...mapConfig, sectors: newSectors };
};

const BuyBody: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // índice label -> seatId usando dados vindos do SSR (chave `${row}-${number}`)
  const seatIdByLabel = (() => {
    const map = new Map<string, string>();
    for (const cat of event.ticketCategories) {
      for (const s of cat.seats) {
        if (s.row && typeof s.number === "number") {
          map.set(`${s.row}-${s.number}`, s.id);
        }
      }
    }
    return map;
  })();

  const handleSelect = (sector: string, row: string, seat: number, price: number) => {
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

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const totalTickets = selectedSeats.length;
  const disabled = totalTickets === 0;

  const staticMap = eventMaps["belgrano"];
  if (!staticMap) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-gray-500">Mapa del evento no encontrado.</span>
      </div>
    );
  }
  const mapConfig = mergeMapWithTicketPrices(staticMap, event.ticketCategories);

  const totalAvailableSeats = event.ticketCategories.flatMap((cat) =>
    cat.seats.filter((s) => s.status === "AVAILABLE")
  ).length;

  // ✅ ALTERAÇÃO: usar o procedimento correto do router (createSeated)
  const createOrder = trpc.order.createSeated.useMutation();

  const handleBuy = async () => {
    if (!termsAccepted || selectedSeats.length === 0) {
      alert("Debe aceptar los términos y seleccionar al menos una entrada.");
      return;
    }

    const eventSessionId = event.eventSessions?.[0]?.id;
    if (!eventSessionId) {
      alert("No se pudo encontrar la sesión del evento.");
      return;
    }

    // ✅ ALTERAÇÃO: enviar seatIds (ids reais dos assentos)
    const seatIds: string[] = [];
    for (const s of selectedSeats) {
      const key = `${s.row}-${s.seat}`;
      const id = seatIdByLabel.get(key);
      if (!id) {
        alert(`Asiento no encontrado: ${key}`);
        return;
      }
      seatIds.push(id);
    }

    try {
      const order: CreatedOrder = await createOrder.mutateAsync({
        eventId: event.id,
        eventSessionId,
        seatIds,
      });
      router.push(`/checkout/${order.id}`);
    } catch (e) {
      console.error("💥 Erro ao criar pedido:", e);
      alert("Uno o más asientos ya no están disponibles.");
    }
  };

  return (
    <div className="mx-auto my-4 flex max-w-[1200px] flex-col gap-8 rounded-lg border border-gray-300 bg-white p-6 shadow-lg lg:flex-row">
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <EventMap
          mapConfig={mapConfig}
          onSelect={handleSelect}
          selectedSeats={selectedSeats}
          maxReached={selectedSeats.length >= 5}
          soldSeats={event.ticketCategories.flatMap((cat) =>
            cat.seats
              .filter((s) => s.status === "SOLD" || s.status === "RESERVED")
              .map((s) => ({
                sector: cat.title,
                row: s.row ?? "",
                seat: s.number ?? 0,
              }))
          )}
        />
      </div>

      <div className="w-full lg:w-1/2">
        <h2 className="w-fit rounded bg-gray-400 px-4 py-2 text-sm font-bold text-white">
          DOM-06/JUL
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Total de asientos disponibles: {totalAvailableSeats}
        </p>

        {selectedSeats.length > 0 ? (
          <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-2">
            {selectedSeats.map((s, i) => (
              <div key={`${s.row}-${s.seat}-${i}`} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <p>Sector: {s.sector}</p>
                  <p>
                    Asiento: {s.row}-{s.seat}
                  </p>
                </div>
                <p>Precio: ${s.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No has seleccionado ningún asiento aún.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              Acepto los términos y condiciones
            </label>
          </div>
          <button
            disabled={disabled || !termsAccepted}
            onClick={handleBuy}
            className="w-full rounded bg-primary-100 py-2 font-bold text-white hover:bg-primary-200 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Comprar ahora ({totalTickets} ingresso{totalTickets > 1 ? "s" : ""}) - $
            {totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBody;
