// src/pages/cart/index.tsx
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Header from "@/components/principal/header/Header";
import FooterComponent from "@/components/principal/footer/Footer";
import { MdShoppingCart, MdAdd, MdRemove, MdDelete, MdArrowBack, MdPayment } from "react-icons/md";

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
      <Head>
        <title>Mi Carrito - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <Header />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header da página */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <MdShoppingCart className="text-4xl text-white" />
            </div>
            <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">Mi Carrito</h1>
          </div>

        {isLoading && (!cart || cart.length === 0) ? (
          <div className="max-w-md mx-auto rounded-lg bg-white p-6 shadow-md text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
            <h2 className="mb-2 text-xl font-bold text-gray-700">Cargando carrito...</h2>
          </div>
        ) : cart && cart.length === 0 ? (
          <div className="max-w-md mx-auto rounded-lg bg-white p-6 shadow-md text-center">
            <MdShoppingCart className="mx-auto mb-4 text-6xl text-gray-400" />
            <h2 className="mb-2 text-xl font-bold text-gray-600">Tu carrito está vacío</h2>
            <p className="mb-6 text-gray-500">Agrega algunos eventos para comenzar tu compra.</p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
            >
              <MdArrowBack className="text-xl" />
              Continuar comprando
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Indicador de atualização */}
            {isFetching && (
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-700">🔄 Actualizando carrito...</p>
              </div>
            )}

            {/* Lista de itens */}
            <div className="space-y-4">
              {cart?.map((item) => {
                const price = item.seat?.ticketCategory?.price ?? item.ticketCategory?.price ?? 0;
                const event = item.eventSession?.event;
                const sessionDate = item.eventSession?.dateTimeStart
                  ? new Date(item.eventSession.dateTimeStart).toLocaleString("es-AR")
                  : "Fecha no disponible";

                return (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white p-4 md:p-6 shadow-lg"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Imagem e informações do evento */}
                      <div className="flex items-center gap-4">
                        {event?.image && (
                          <div className="flex-shrink-0">
                            <Image
                              src={event.image}
                              alt={event.name}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{event?.name}</h3>
                          <p className="text-sm text-gray-500">{sessionDate}</p>
                          <p className="text-sm text-gray-600">
                            {item.ticketCategory?.title ??
                              (item.seat ? `Asiento ${item.seat.labelFull}` : "Entrada")}
                          </p>
                          <p className="text-lg font-bold text-primary-100">${price.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Controles de quantidade e remoção */}
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantityMutation.mutate({
                                cartItemId: item.id,
                                quantity: item.quantity - 1,
                              })
                            }
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                          >
                            <MdRemove className="text-sm" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantityMutation.mutate({
                                cartItemId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={updateQuantityMutation.isPending}
                          >
                            <MdAdd className="text-sm" />
                          </button>
                        </div>

                        <button
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => removeMutation.mutate({ cartItemId: item.id })}
                          disabled={removeMutation.isPending}
                        >
                          <MdDelete className="text-lg" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo e botões de ação */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-primary-100">${total.toFixed(2)}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-primary-100 bg-white px-6 py-3 font-semibold text-primary-100 transition-all hover:bg-primary-50 hover:border-orange-600"
                  onClick={() => router.push("/")}
                >
                  <MdArrowBack className="text-xl" />
                  Vamos a seguir comprando
                </button>

                <button
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createFromCart.isPending || isRedirecting}
                  onClick={handleCheckout}
                >
                  <MdPayment className="text-xl" />
                  {isRedirecting || createFromCart.isPending
                    ? "Redirigiendo..."
                    : "Proceder al Checkout"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
      
      <FooterComponent />
    </div>
  );
}
