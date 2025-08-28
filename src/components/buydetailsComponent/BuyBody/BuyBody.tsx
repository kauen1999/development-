// src/components/buydetailsComponent/BuyBody/BuyBody.tsx
import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";
import { EventMap } from "../../BuyBody/EventMap";

interface Props {
  event: {
    eventSessions: { id: string; date: string; venueName: string }[];
    id: string;
    name: string;
    date: string;
    image: string | null;
    city: string;
    venueName: string;
    ticketCategories: {
      id: string;           // ticketCategoryId
      title: string;        // nome do setor
      price: number;
      seats: {
        id: string;
        label: string | null;     // ex.: "A10"
        row: string | null;       // ex.: "A"
        number: number | null;    // ex.: 10
        status: "AVAILABLE" | "RESERVED" | "SOLD";
        eventSessionId?: string;  // ✅ opcional (condicional no filtro)
      }[];
    }[];
    category: { id: string; name: string };
  };
}

type SeatSelection = {
  sectorId: string;
  sectorName: string;
  row: string;   // "A"
  seat: number;  // 10
  price: number;
};

type CreatedOrder = { id: string };

function normalizeRow(row: string | null): string {
  return (row ?? "").trim().toUpperCase();
}

const BuyBody: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<SeatSelection[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // usa a primeira sessão (como no fluxo atual)
  const selectedSessionId = useMemo(
    () => event.eventSessions?.[0]?.id ?? null,
    [event.eventSessions]
  );

  // ------ Map config derivado do BD (filtro condicional de sessão) ------
  const mapConfig = useMemo(() => {
    const sectors = event.ticketCategories.map((tc) => {
      const rowsMap = new Map<string, { name: string; seatNumbers: Set<number>; price: number }>();

      for (const s of tc.seats) {
        const sameSession =
          !selectedSessionId || !s.eventSessionId || s.eventSessionId === selectedSessionId;
        if (!sameSession) continue;

        const rowName = normalizeRow(s.row);
        const seatNumber = typeof s.number === "number" ? s.number : null;
        if (!rowName || seatNumber === null) continue;

        let rowObj = rowsMap.get(rowName);
        if (!rowObj) {
          rowObj = { name: rowName, seatNumbers: new Set<number>(), price: tc.price };
          rowsMap.set(rowName, rowObj);
        }
        rowObj.seatNumbers.add(seatNumber);
      }

      const rows = Array.from(rowsMap.values()).map((r) => ({
        name: r.name,
        seatNumbers: Array.from(r.seatNumbers).sort((a, b) => a - b),
        price: r.price,
      }));

      return { id: tc.id, name: tc.title, rows };
    });

    return { name: event.name, sectors };
  }, [event, selectedSessionId]);

  // ------ Índice de vendidos/bloqueados por "sectorId|ROW|number" ------
  const soldSeatIndex = useMemo(() => {
    const sold = new Set<string>();
    for (const cat of event.ticketCategories) {
      for (const s of cat.seats) {
        const sameSession =
          !selectedSessionId || !s.eventSessionId || s.eventSessionId === selectedSessionId;
        if (!sameSession) continue;

        const rowName = normalizeRow(s.row);
        const seatNumber = typeof s.number === "number" ? s.number : null;
        if (!rowName || seatNumber === null) continue;

        if (s.status === "SOLD" || s.status === "RESERVED") {
          sold.add(`${cat.id}|${rowName}|${seatNumber}`);
        }
      }
    }
    return sold;
  }, [event.ticketCategories, selectedSessionId]);

  // ------ Lookup de seatId: aceita PIPE e LABEL + filtro condicional de sessão ------
  const seatMetaByKey = useMemo(() => {
    const m = new Map<string, { id: string }>();
    for (const cat of event.ticketCategories) {
      for (const s of cat.seats) {
        const sameSession =
          !selectedSessionId || !s.eventSessionId || s.eventSessionId === selectedSessionId;
        if (!sameSession) continue;

        const row = normalizeRow(s.row);
        const num = typeof s.number === "number" ? s.number : null;
        if (!row || num === null) continue;

        const label = `${row}${num}`; // "A10"
        const meta = { id: s.id };

        m.set(`${cat.id}|${row}|${num}`, meta); // PIPE ex.: "catId|A|10"
        m.set(`${cat.id}|${label}`, meta);      // LABEL ex.: "catId|A10"
      }
    }
    return m;
  }, [event.ticketCategories, selectedSessionId]);

  // ------ Seleção ------
  const handleSelect = (
    sectorId: string,
    sectorName: string,
    row: string,
    seat: number,
    price: number
  ) => {
    const already = selectedSeats.some(
      (s) => s.sectorId === sectorId && s.row === row && s.seat === seat
    );
    if (already) {
      setSelectedSeats((prev) =>
        prev.filter((s) => !(s.sectorId === sectorId && s.row === row && s.seat === seat))
      );
    } else {
      if (selectedSeats.length >= 5) return; // regra: 5 ingressos
      setSelectedSeats((prev) => [...prev, { sectorId, sectorName, row, seat, price }]);
    }
  };

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const totalTickets = selectedSeats.length;
  const disabled = totalTickets === 0;

  const totalAvailableSeats = useMemo(
    () =>
      event.ticketCategories.flatMap((cat) =>
        cat.seats.filter((s) => {
          const sameSession =
            !selectedSessionId || !s.eventSessionId || s.eventSessionId === selectedSessionId;
          return sameSession && s.status === "AVAILABLE";
        })
      ).length,
    [event.ticketCategories, selectedSessionId]
  );

  const createOrder = trpc.order.createSeated.useMutation();

  const handleBuy = async () => {
    if (!termsAccepted || selectedSeats.length === 0) {
      alert("Debe aceptar los términos y seleccionar al menos una entrada.");
      return;
    }

    if (!selectedSessionId) {
      alert("No se pudo encontrar la sesión del evento.");
      return;
    }

    // Converte seleção UI -> seatIds (LABEL e PIPE)
    const seatIds: string[] = [];
    for (const s of selectedSeats) {
      const rowUp = s.row.toUpperCase();
      const label = `${rowUp}${s.seat}`;            
      const keyByLabel = `${s.sectorId}|${label}`;    
      const keyByPipe  = `${s.sectorId}|${rowUp}|${s.seat}`; // "catId|A|10"

      const meta = seatMetaByKey.get(keyByLabel) ?? seatMetaByKey.get(keyByPipe);
      if (!meta) {
        console.warn("Seat lookup miss", { sectorId: s.sectorId, row: s.row, seat: s.seat, keys: [keyByLabel, keyByPipe] });
        alert(`Asiento no encontrado: ${s.sectorName} ${label}`);
        return;
      }
      seatIds.push(meta.id);
    }

    try {
      const order: CreatedOrder = await createOrder.mutateAsync({
        eventId: event.id,
        eventSessionId: selectedSessionId,
        seatIds,
      });
      router.push(`/checkout/${order.id}`);
    } catch (e) {
      console.error("💥 Error al crear el pedido:", e);
      alert("Uno o más asientos ya no están disponibles.");
    }
  };

  return (
    <div className="mx-auto my-4 flex max-w-[1200px] flex-col gap-8 rounded-lg border border-gray-300 bg-white p-6 shadow-lg lg:flex-row">
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <EventMap
          mapConfig={mapConfig}
          onSelect={handleSelect}
          selectedSeats={selectedSeats.map((s) => ({
            sectorId: s.sectorId,
            row: s.row,
            seat: s.seat,
          }))}
          maxReached={selectedSeats.length >= 5}
          soldSeatsIndex={soldSeatIndex}
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
              <div key={`${s.sectorId}-${s.row}-${s.seat}-${i}`} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <p>Sector: {s.sectorName}</p>
                  <p>Asiento: {`${s.row}${s.seat}`}</p>
                </div>
                <p>Precio: ${s.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No has seleccionado ningún asiento aún.</p>
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
            Comprar ahora ({totalTickets} ingresso{totalTickets > 1 ? "s" : ""}) - ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBody;
