// src/pages/index.tsx
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";
import Header from "@/components/principal/header/Header";
import FooterComponent from "@/components/principal/footer/Footer";
import Image from "next/image";

export default function CartPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Prefetch carrinho
  useEffect(() => {
    utils.cart.list.prefetch();
  }, [utils.cart.list]);

  const { data: cart, isLoading, isFetching } = trpc.cart.list.useQuery(undefined, {
    initialData: () => utils.cart.list.getData(),
  });

  const removeMutation = trpc.cart.remove.useMutation({
    onMutate: async (vars) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData();
      utils.cart.list.setData(undefined, (old = []) =>
        old.filter((i) => i.id !== vars.cartItemId)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.cart.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.cart.list.invalidate(),
  });

  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onMutate: async (vars) => {
      await utils.cart.list.cancel();
      const prev = utils.cart.list.getData();
      utils.cart.list.setData(undefined, (old = []) =>
        old.map((i) =>
          i.id === vars.cartItemId ? { ...i, quantity: vars.quantity } : i
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.cart.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.cart.list.invalidate(),
  });

  // 🚀 Criação de ordem otimizada
  const createFromCart = trpc.order.createFromCart.useMutation({
    onMutate: () => {
      setIsRedirecting(true);
    },
    onSuccess: async (order) => {
      try {
        // 🔥 Redireciona primeiro
        await router.push(`/checkout/${order.id}`);
        // 🔥 Só depois limpa o carrinho
        await utils.cart.list.invalidate();
      } finally {
        setIsRedirecting(false);
      }
    },
    onError: (err) => {
      console.error("❌ Error al crear orden:", err);
      alert("No fue posible generar la orden. Inténtalo nuevamente.");
      setIsRedirecting(false);
    },
  });

  const handleCheckout = () => {
    if (!cart || cart.length === 0) return;
    createFromCart.mutate();
  };

  const total =
    cart?.reduce((sum: number, item) => {
      const price = item.seat?.ticketCategory?.price ?? item.ticketCategory?.price ?? 0;
      return sum + item.quantity * price;
    }, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header minimal />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-primary-100 mb-6">🛒 Mi Carrito</h1>

        {isLoading && (!cart || cart.length === 0) ? (
          <p className="text-gray-500">Cargando carrito...</p>
        ) : cart && cart.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Tu carrito está vacío.</p>
            <div className="mt-4">
              <button
                onClick={() => router.push("/")}
                className="px-5 py-2 rounded-lg border border-primary-100 text-primary-100 font-semibold hover:bg-primary-50 transition"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        ) : (
          <>
            {isFetching && <p className="text-xs text-gray-400 mb-2">🔄 Actualizando carrito...</p>}

            <ul className="space-y-4">
              {cart?.map((item) => {
                const price = item.seat?.ticketCategory?.price ?? item.ticketCategory?.price ?? 0;
                const event = item.eventSession?.event;
                const sessionDate = item.eventSession?.dateTimeStart
                  ? new Date(item.eventSession.dateTimeStart).toLocaleString("es-AR")
                  : "Fecha no disponible";

                return (
                  <li
                    key={item.id}
                    className="bg-white shadow rounded-lg p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      {event?.image && (
                        <Image
                          src={event.image}
                          alt={event.name}
                          width={80}
                          height={60}
                          className="rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">{event?.name}</p>
                        <p className="text-sm text-gray-500">{sessionDate}</p>
                        <p className="text-sm text-gray-500">
                          {item.ticketCategory?.title ??
                            (item.seat ? `Asiento ${item.seat.labelFull}` : "Entrada")}{" "}
                          — ${price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              cartItemId: item.id,
                              quantity: item.quantity - 1,
                            })
                          }
                          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                          disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              cartItemId: item.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                          disabled={updateQuantityMutation.isPending}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        onClick={() => removeMutation.mutate({ cartItemId: item.id })}
                        disabled={removeMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-primary-100">${total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  className="w-full bg-white text-primary-100 border border-primary-100 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
                  onClick={() => router.push("/")}
                >
                  Vamos a seguir comprando
                </button>

                <button
                  className="w-full bg-primary-100 text-white py-3 rounded-lg font-semibold hover:bg-primary-200 transition"
                  disabled={createFromCart.isPending || isRedirecting}
                  onClick={handleCheckout}
                >
                  {isRedirecting || createFromCart.isPending
                    ? "Redirigiendo..."
                    : "Proceder al Checkout"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <FooterComponent />
    </div>
  );
}
