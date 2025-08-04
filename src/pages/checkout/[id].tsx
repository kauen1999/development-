// src/pages/checkout/[id].tsx
import type { GetServerSideProps, NextPage } from "next";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";
import CheckoutContent from "@/components/checkout/CheckoutContent";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";

interface Props {
  title: string;
  price: number;
  sector: string;
  cant: number;
  picture: string;
  orderId: string;
}

const CheckoutPage: NextPage<Props> = ({ title, price, sector, cant, picture, orderId }) => {
  return (
    <>
      <Header buyPage home />
      <CheckoutContent
        title={title}
        price={price}
        sector={sector}
        cant={cant}
        picture={picture}
        orderId={orderId}
      />
      <Footer />
    </>
  );
};

export default CheckoutPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  const orderId = ctx.params?.id as string;

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  if (!orderId) {
    return { notFound: true };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      orderItems: {
        include: {
          seat: {
            include: {
              ticketCategory: true,
            },
          },
        },
      },
    },
  });

  const firstItem = order?.orderItems?.[0];
  const firstSeat = firstItem?.seat;

  if (!order || !firstItem || !firstSeat || !firstSeat.ticketCategory) {
    return { notFound: true };
  }

  return {
    props: {
      title: order.event.name,
      price: order.total,
      cant: order.orderItems.length,
      sector: firstSeat.ticketCategory.title ?? "",
      picture: order.event.image || "/banner.jpg",
      orderId,
    },
  };
};
