import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";
import Header from "@/components/principal/header/Header";
import FooterComponent from "@/components/principal/footer/Footer";
import Image from "next/image";

export default function CartPage() {
  const router = useRouter();
  const { data: cart = [], refetch, isLoading } = trpc.cart.list.useQuery();
  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => refetch(),
  });
  const updateQuantityMutation = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => refetch(),
  });

  const createFromCart = trpc.order.createFromCart.useMutation({
    onSuccess: (order) => {
      router.push(`/checkout/${order.id}`);
    },
    onError: (err) => {
      console.error("❌ Error al crear orden desde carrito:", err);
      alert("No fue posible generar la orden. Inténtalo nuevamente.");
    },
  });

  const total = cart.reduce((sum: number, item) => {
    const price =
      item.seat?.ticketCategory?.price ??
      item.ticketCategory?.price ??
      0;
    return sum + item.quantity * price;
  }, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner text-primary-100" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header minimal />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-primary-100 mb-6">
          🛒 Mi Carrito
        </h1>

        {cart.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Tu carrito está vacío.</p>

            {/* ➕ Botão Continuar comprando */}
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
            <ul className="space-y-4">
              {cart.map((item) => {
                const price =
                  item.seat?.ticketCategory?.price ??
                  item.ticketCategory?.price ??
                  0;
                const event = item.eventSession?.event;

                return (
                  <li
                    key={item.id}
                    className="bg-white shadow rounded-lg p-4 flex justify-between items-center"
                  >
                    {/* Esquerda: imagem + infos */}
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
                        <p className="font-semibold text-gray-800">
                          {event?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(
                            item.eventSession?.dateTimeStart ?? ""
                          ).toLocaleString("es-AR")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.ticketCategory?.title ??
                            (item.seat
                              ? `Asiento ${item.seat.labelFull}`
                              : "Entrada")}{" "}
                          — ${price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Direita: quantidade + eliminar */}
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
                          disabled={
                            updateQuantityMutation.isPending || item.quantity <= 1
                          }
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
                        onClick={() =>
                          removeMutation.mutate({ cartItemId: item.id })
                        }
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
                <span className="text-lg font-semibold text-gray-700">
                  Total
                </span>
                <span className="text-xl font-bold text-primary-100">
                  ${total.toFixed(2)}
                </span>
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
                  disabled={createFromCart.isPending}
                  onClick={() => createFromCart.mutate()}
                >
                  {createFromCart.isPending
                    ? "Procesando..."
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
