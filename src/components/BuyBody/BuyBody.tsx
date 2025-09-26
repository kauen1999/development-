// src/components/BuyBody/BuyBody.tsx
import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { trpc } from "@/utils/trpc";
import { EventMap } from "./EventMap";
import type { EventMapConfig } from "./EventMap";

interface EventSeated {
  id: string;
  name: string;
  image: string | null;
  sessions: { id: string; date: string; venueName: string }[];
  ticketCategories: {
    id: string;
    title: string;
    price: number;
    seats: {
      id: string;
      row: string | null;
      number: number | null;
      status: "AVAILABLE" | "RESERVED" | "SOLD";
    }[];
  }[];
  type: "SEATED";
}

interface EventGeneral {
  id: string;
  name: string;
  image: string | null;
  eventSessionId: string;
  categories: {
    id: string;
    title: string;
    price: number;
    capacity: number;
  }[];
  type: "GENERAL";
}

type Props = {
  event: EventSeated | EventGeneral;
};

type SeatSelection = {
  seatId?: string;
  ticketCategoryId: string;
  sectorName: string;
  row?: string;
  seat?: number;
  quantity: number;
  price: number;
};

const BuyBody: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [selected, setSelected] = useState<SeatSelection[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const utils = trpc.useUtils();

  const selectedSessionId =
    event.type === "SEATED"
      ? event.sessions?.[0]?.id ?? ""
      : event.eventSessionId;

  const addManyToCart = trpc.cart.addMany.useMutation({
    onMutate: (vars) => {
      const optimisticItems = vars.items.map((s, idx) => ({
        id: `optimistic-${Date.now()}-${idx}`,
        quantity: s.quantity ?? 1,
        seatId: s.seatId ?? null,
        ticketCategoryId: s.ticketCategoryId,
        eventSessionId: vars.eventSessionId,
        eventSession: {
          id: vars.eventSessionId,
          event: {
            id: event.id,
            name: event.name,
            image: event.image,
            status: "PUBLISHED",
            createdAt: new Date(),
            updatedAt: new Date(),
            publishedAt: new Date(),
            description:
              event.type === "SEATED"
                ? "Evento con asientos"
                : "Evento general",
            startDate: null,
            endDate: null,
            venueName: "",
            organizerId: "optimistic",
            slug: event.name.toLowerCase().replace(/\s+/g, "-"),
            categoryId: "optimistic-category",
          },
        },
        ticketCategory:
          event.type === "SEATED"
            ? event.ticketCategories.find((tc) => tc.id === s.ticketCategoryId) ??
              null
            : event.categories.find((c) => c.id === s.ticketCategoryId) ?? null,
        seat:
          event.type === "SEATED"
            ? event.ticketCategories
                .flatMap((tc) => tc.seats)
                .find((seat) => seat.id === s.seatId) ?? null
            : null,
      }));

      // Cast controlado para não quebrar tipagem
      utils.cart.list.setData(
        undefined,
        (old = []) => [...old, ...(optimisticItems as unknown as typeof old)]
      );

      router.push("/cart");
    },
    onSettled: () => {
      utils.cart.list.invalidate();
    },
    onError: (error) => {
      console.error("❌ Error al agregar al carrito:", error);
      alert("No se pudo agregar al carrito.");
    },
  });

  // ---------- Map config (SEATED) ----------
  const mapConfig: EventMapConfig | null = useMemo(() => {
    if (event.type !== "SEATED") return null;
    return {
      name: event.name,
      sectors: event.ticketCategories.map((tc) => ({
        id: tc.id,
        name: tc.title,
        rows: [
          {
            name: tc.title,
            seats: tc.seats
              .filter((s) => s.number !== null)
              .map((s) => ({
                id: s.id,
                number: s.number as number,
                status: s.status,
                price: tc.price,
              })),
          },
        ],
      })),
    };
  }, [event]);

  // ---------- SEATED ----------
  const handleSelectSeat = (
    seatId: string,
    sectorName: string,
    row: string,
    seat: number,
    price: number
  ) => {
    const already = selected.some((s) => s.seatId === seatId);
    if (already) {
      setSelected((prev) => prev.filter((s) => s.seatId !== seatId));
      return;
    }
    const selectedSeatCount = selected.filter((s) => s.seatId).length;
    if (selectedSeatCount >= 5) return;

    const category =
      event.type === "SEATED"
        ? event.ticketCategories.find((tc) =>
            tc.seats.some((ss) => ss.id === seatId)
          )
        : null;

    if (!category) return;

    setSelected((prev) => [
      ...prev,
      {
        seatId,
        ticketCategoryId: category.id,
        sectorName,
        row,
        seat,
        quantity: 1,
        price,
      },
    ]);
  };

  // ---------- GENERAL ----------
  const updateGeneralQty = (
    ticketCategoryId: string,
    title: string,
    price: number,
    delta: number,
    capacity: number
  ) => {
    setSelected((prev) => {
      const item = prev.find(
        (s) => s.ticketCategoryId === ticketCategoryId && !s.seatId
      );
      if (item) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) {
          return prev.filter(
            (s) => !(s.ticketCategoryId === ticketCategoryId && !s.seatId)
          );
        }
        if (nextQty > capacity) {
          alert("No hay más entradas disponibles.");
          return prev;
        }
        return prev.map((s) =>
          s.ticketCategoryId === ticketCategoryId && !s.seatId
            ? { ...s, quantity: nextQty }
            : s
        );
      }
      if (delta > 0) {
        return [
          ...prev,
          { ticketCategoryId, sectorName: title, quantity: 1, price },
        ];
      }
      return prev;
    });
  };

  const getGeneralQty = (categoryId: string) =>
    selected.find((s) => s.ticketCategoryId === categoryId && !s.seatId)
      ?.quantity ?? 0;

  // ---------- Add to Cart ----------
  const handleAddToCart = () => {
    if (!termsAccepted) {
      alert("Debes aceptar los términos.");
      return;
    }
    if (!selectedSessionId) {
      alert("Sesión no encontrada.");
      return;
    }
    if (selected.length === 0) {
      alert("Seleccione al menos un asiento o entrada.");
      return;
    }

    addManyToCart.mutate({
      eventId: event.id,
      eventSessionId: selectedSessionId,
      items: selected.map((s) => ({
        seatId: s.seatId ?? undefined,
        ticketCategoryId: s.ticketCategoryId,
        quantity: s.quantity,
      })),
    });
  };

  // ------------------ Render ------------------
  return (
    <div className="mx-auto my-4 max-w-[800px] rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
      {event.type === "SEATED" && mapConfig ? (
        <EventMap
          mapConfig={mapConfig}
          onSelect={handleSelectSeat}
          selectedSeats={selected
            .filter((s) => s.seatId)
            .map((s) => ({
              sectorId: s.ticketCategoryId,
              row: s.row ?? "",
              seat: s.seat ?? 0,
            }))}
          maxReached={selected.filter((s) => s.seatId).length >= 5}
          soldSeatsIndex={new Set(
            event.ticketCategories.flatMap((tc) =>
              tc.seats
                .filter((s) => s.status !== "AVAILABLE")
                .map((s) => s.id)
            )
          )}
        />
      ) : (
        <div className="space-y-4">
          {event.type === "GENERAL" &&
            event.categories.map((tc) => {
              const qty = getGeneralQty(tc.id);
              return (
                <div
                  key={tc.id}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div>
                    <p className="font-semibold">{tc.title}</p>
                    <p className="text-sm text-gray-500">${tc.price}.00</p>
                    <p className="text-xs text-gray-400">
                      Disponibles: {tc.capacity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateGeneralQty(tc.id, tc.title, tc.price, -1, tc.capacity)
                      }
                      className="rounded bg-gray-200 px-3 py-1 text-black hover:bg-gray-300 disabled:opacity-50"
                      disabled={qty === 0}
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center">{qty}</span>
                    <button
                      onClick={() =>
                        updateGeneralQty(tc.id, tc.title, tc.price, +1, tc.capacity)
                      }
                      className="rounded bg-[#FF5F00] px-3 py-1 text-white hover:bg-[#ff6c14] disabled:opacity-50"
                      disabled={qty >= tc.capacity}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Terms + Botón */}
      <div className="mt-6">
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
        {!termsAccepted || selected.length === 0 ? (
          <button
            className="w-full cursor-not-allowed rounded-md bg-gray-300 py-3 px-6 font-semibold text-gray-600"
            disabled
          >
            Añadir al carrito
          </button>
        ) : sessionData ? (
          <button
            onClick={handleAddToCart}
            className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white transition hover:bg-[#ff6c14]"
          >
            Añadir al carrito
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white hover:bg-[#ff6c14]"
          >
            Añadir al carrito
          </button>
        )}
      </div>
    </div>
  );
};

export default BuyBody;
