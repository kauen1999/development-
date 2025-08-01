// src/pages/buydetails/[id].tsx
import Header from "../../components/principal/header/Header";
import Footer from "../../components/principal/footer/Footer";
import BuyHero from "../../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../../components/buydetailsComponent/BuyBody/BuyBody";
import { type GetServerSidePropsContext, type NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";

interface Props {
  event: {
    id: string;
    name: string;
    date: string;
    price: number;
    city: string;
    theater: string;
    ticketCategories: {
      id: string;
      title: string;
      price: number;
      stock: number;
      seats: {
        id: string;
        label: string;
        row: string;
        number: number;
      }[];
    }[];
    categories: {
      id: string;
      name: string;
    }[];
  };
}

const BuyDetails: NextPage<Props> = ({ event }) => {
  return (
    <>
      <Header buyPage={true} home={true} />
      <section>
        <BuyHero
          foto="/banner.jpg"
          titulo={event.name}
          fecha={new Date(event.date).toLocaleDateString()}
          horas={new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          ubicacion={event.theater}
          ciudad={event.city}
        />
        <BuyBody event={event} />
      </section>
      <Footer />
    </>
  );
};

export default BuyDetails;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const id = context.query.id as string;
  if (!id) return { notFound: true };

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      ticketCategories: {
        include: { seats: true },
      },
      categories: true,
    },
  });

  if (!event) return { notFound: true };

  return {
    props: {
      event: {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
        price: event.price,
        city: event.city,
        theater: event.theater,
        ticketCategories: event.ticketCategories.map((tc) => ({
          id: tc.id,
          title: tc.title,
          price: tc.price,
          stock: tc.stock,
          seats: tc.seats.map((seat) => ({
            id: seat.id,
            label: seat.label,
            row: seat.row,
            number: seat.number,
          })),
        })),
        categories: event.categories.map((c) => ({
          id: c.id,
          name: c.name,
        })),
      },
    },
  };
}
