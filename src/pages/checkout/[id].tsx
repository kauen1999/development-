import type { GetServerSideProps, NextPage } from "next";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";
import CheckoutContent from "@/components/checkout/CheckoutContent";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";

/** Linha do resumo no checkout */
export interface CheckoutLineItem {
  id: string;
  title: string;
  picture: string | null;
  sessionDateTime: string | null; // ISO serializável
  venueName: string | null;
  city: string | null;
  type: "GENERAL" | "SEATED";
  categoryTitle: string;
  qty: number;
  unitAmount: number;
  subtotal: number;
}

export interface PageProps {
  orderId: string;
  items: CheckoutLineItem[];
  orderTotal: number;
  pictureFallback: string;
}

const CheckoutPage: NextPage<PageProps> = ({
  orderId,
  items,
  orderTotal,
  pictureFallback,
}) => {
  return (
    <>
      <Header minimal />
      <CheckoutContent
        orderId={orderId}
        items={items}
        orderTotal={orderTotal}
        pictureFallback={pictureFallback}
      />
      <Footer />
    </>
  );
};

export default CheckoutPage;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  const orderId = ctx.params?.id as string | undefined;

  if (!session) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }
  if (!orderId) return { notFound: true };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      Event: true,
      EventSession: true,
      orderItems: {
        include: {
          seat: {
            include: {
              ticketCategory: true,
              event: true,
              eventSession: true,
            },
          },
          ticketCategory: {
            include: {
              Event: true,
              session: { include: { event: true } },
            },
          },
        },
      },
    },
  });

  if (!order || (order.orderItems?.length ?? 0) === 0) {
    return { notFound: true };
  }
  
    // ✅ Só limpa o carrinho depois que o usuário já entrou no checkout
  await prisma.cartItem.deleteMany({
    where: { userId: session.user.id },
  });

  // Imagem padrão caso o evento não tenha
  const pictureFallback = "/images/default-event.jpg";

  const items: CheckoutLineItem[] = order.orderItems.map((it) => {
    const qty = Math.max(1, Number(it.qty ?? 1));
    const lineAmount = Number(it.amount ?? 0);
    const unitAmount = qty > 0 ? lineAmount / qty : 0;

    const session =
      it.seat?.eventSession ??
      it.ticketCategory?.session ??
      order.EventSession ??
      null;

    const ev =
      it.seat?.event ??
      it.ticketCategory?.session?.event ??
      it.ticketCategory?.Event ??
      order.Event ??
      null;

    return {
      id: it.id,
      title: ev?.name ?? "Evento",
      picture: ev?.image || pictureFallback,
      sessionDateTime: session?.dateTimeStart
        ? session.dateTimeStart.toISOString()
        : null,
      venueName: session?.venueName ?? null,
      city: session?.city ?? null,
      type: it.seatId ? "SEATED" : "GENERAL",
      categoryTitle:
        it.seat?.ticketCategory?.title ??
        it.ticketCategory?.title ??
        "General",
      qty,
      unitAmount,
      subtotal: lineAmount,
    };
  });

  return {
    props: {
      orderId,
      items,
      orderTotal: Number(order.total ?? 0),
      pictureFallback,
    },
  };
};
