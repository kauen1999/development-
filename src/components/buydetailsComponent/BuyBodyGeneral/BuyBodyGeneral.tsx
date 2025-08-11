// src/components/buydetailsComponent/BuyBodyGeneral/BuyBodyGeneral.tsx
import React, { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";

type Category = {
  id: string;
  title: string;
  price: number;
  capacity: number; // real stock available from SSR
};

interface Props {
  event: {
    id: string;
    name: string;
    image: string | null;
    city: string;
    venueName: string;
    eventSessionId: string; // ✅ alterado para novo nome
    sessionDateISO?: string;
    categories: Category[];
  };
}

const MAX_TICKETS_PER_ORDER = 5;

const formatterARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

function formatBadge(dateISO?: string) {
  if (!dateISO) return "—";
  const d = new Date(dateISO);
  const dow = d.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase().slice(0, 3);
  const day = d.toLocaleDateString("es-AR", { day: "2-digit" });
  const mon = d.toLocaleDateString("es-AR", { month: "short" }).toUpperCase().replace(".", "");
  return `${dow}-${day}/${mon}`;
}

const BuyBodyGeneral: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  const totalTickets = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + (b || 0), 0),
    [quantities]
  );

  const totalAmount = useMemo(() => {
    return event.categories.reduce(
      (sum, c) => sum + (quantities[c.id] || 0) * c.price,
      0
    );
  }, [event.categories, quantities]);

  const createGeneral = trpc.order.createGeneral.useMutation({
    onSuccess: (order) => {
      router.push(`/checkout/${order.id}`);
    },
    onError: (err) => {
      console.error(err);
      alert(err.message || "No se pudo crear el pedido.");
    },
  });

  const getAllowedMaxForCategory = (categoryId: string, categoryCap: number) => {
    const others = Object.entries(quantities).reduce((acc, [id, q]) => {
      if (id === categoryId) return acc;
      return acc + (q || 0);
    }, 0);
    return Math.max(0, Math.min(categoryCap, MAX_TICKETS_PER_ORDER - others));
  };

  const setQty = (categoryId: string, next: number, categoryCap: number) => {
    const allowedMax = getAllowedMaxForCategory(categoryId, categoryCap);
    const q = Math.max(0, Math.min(next, allowedMax));
    setQuantities((prev) => ({ ...prev, [categoryId]: q }));
  };

  const handleBuy = () => {
    if (!termsAccepted) {
      alert("Debes aceptar los términos y condiciones.");
      return;
    }
    if (totalTickets === 0) {
      alert("Selecciona al menos una entrada.");
      return;
    }
    if (totalTickets > MAX_TICKETS_PER_ORDER) {
      alert(`Puedes comprar hasta ${MAX_TICKETS_PER_ORDER} entradas por vez.`);
      return;
    }

    const items = event.categories
      .map((c) => ({
        categoryId: c.id,
        qty: quantities[c.id] || 0,
        price: c.price,
      }))
      .filter((i) => i.qty > 0);

    createGeneral.mutate({
      eventId: event.id,
      eventSessionId: event.eventSessionId, // ✅ nome atualizado
      items,
    });
  };

  const buyDisabled =
    !termsAccepted || totalTickets === 0 || createGeneral.isLoading;

  return (
    <div className="mx-auto my-4 flex max-w-[1200px] flex-col gap-8 rounded-lg border border-gray-300 bg-white p-6 shadow-lg lg:flex-row">
      <div className="w-full lg:w-1/2">
        <h2 className="w-fit rounded bg-gray-400 px-4 py-2 text-sm font-bold text-white">
          {formatBadge(event.sessionDateISO)}
        </h2>

        <div className="mt-4 space-y-4">
          {event.categories.map((c) => {
            const qty = quantities[c.id] || 0;
            const allowedMax = getAllowedMaxForCategory(c.id, c.capacity);
            const canIncrement = qty < allowedMax;

            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">{c.title}</span>
                  <span className="text-sm text-gray-500">
                    {formatterARS.format(c.price)} • Máximo disponible:{" "}
                    {c.capacity}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty(c.id, qty - 1, c.capacity)}
                    className="rounded bg-gray-100 px-3 py-1 text-lg font-bold hover:bg-gray-200 disabled:opacity-50"
                    disabled={qty <= 0}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={allowedMax}
                    value={qty}
                    onChange={(e) =>
                      setQty(c.id, Number(e.target.value), c.capacity)
                    }
                    className="w-16 rounded border px-3 py-1 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(c.id, qty + 1, c.capacity)}
                    className="rounded bg-gray-100 px-3 py-1 text-lg font-bold hover:bg-gray-200 disabled:opacity-50"
                    disabled={!canIncrement}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full lg:w-1/2">
        {totalTickets > 0 ? (
          <>
            <div className="mt-1 max-h-64 space-y-4 overflow-y-auto pr-2">
              {event.categories
                .filter((c) => (quantities[c.id] || 0) > 0)
                .map((c) => {
                  const qty = quantities[c.id] || 0;
                  const lineTotal = c.price * qty;
                  return (
                    <div key={c.id} className="border-b pb-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{c.title}</p>
                        <span className="rounded bg-gray-200 px-2 py-1 text-sm">
                          {qty}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <p>
                          {formatterARS.format(c.price)} × {qty}
                        </p>
                        <p className="font-semibold">
                          {formatterARS.format(lineTotal)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-4 pt-4">
              <h3 className="mb-2 text-lg font-semibold">Resumen de tu compra</h3>
              <div className="flex justify-between text-sm">
                <span>Entradas</span>
                <span className="font-semibold">{totalTickets}</span>
              </div>
              <div className="mt-1 flex justify-between text-base font-bold">
                <span>Total de la compra</span>
                <span>{formatterARS.format(totalAmount)}</span>
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
              {sessionData ? (
                <button
                  onClick={handleBuy}
                  className="w-full rounded-md bg-[#FF5F00] py-3 px-6 font-semibold text-white transition hover:bg-[#FF5F00] disabled:opacity-60"
                  disabled={buyDisabled}
                >
                  {createGeneral.isLoading ? "Procesando..." : "Comprar ahora"}
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
        ) : (
          <p className="mt-4 text-gray-600">Selecciona al menos una entrada.</p>
        )}
      </div>
    </div>
  );
};

export default BuyBodyGeneral;
