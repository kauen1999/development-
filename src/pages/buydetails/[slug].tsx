// src/pages/buydetails/[slug].tsx
import Header from "../../components/principal/header/Header";
import Footer from "../../components/principal/footer/Footer";
import BuyHero from "../../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../../components/buydetailsComponent/BuyBody/BuyBody";
import type { GetServerSidePropsContext, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";

interface ServerSideEvent {
  id: string;
  name: string;
  image: string | null;
  date: string;
  city: string;
  venueName: string;
  sessions: {
    id: string;
    date: string;
    venueName: string;
  }[];
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
}

interface Props {
  event: ServerSideEvent;
}

const BuyDetails: NextPage<Props> = ({ event }) => {
  return (
    <>
      <Header buyPage={true} home={true} />
      <section>
        <BuyHero
          foto={event.image ?? "/banner.jpg"}
          titulo={event.name}
          fecha={new Date(event.date).toLocaleDateString()}
          horas={new Date(event.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          ubicacion={event.venueName}
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

  const slug = context.query.slug as string;
  if (!slug) return { notFound: true };

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      sessions: true,
      ticketCategories: {
        include: {
          seats: true,
        },
      },
      category: true,
    },
  });

  // Verifica se o evento, sessões e categorias estão disponíveis
  if (!event || event.ticketCategories.length === 0 || event.sessions.length === 0) {
    return { notFound: true };
  }

  const firstSession = event.sessions?.[0];

  return {
    props: {
      event: {
        id: event.id,
        name: event.name,
        image: event.image ?? null,
        date: firstSession?.date
          ? firstSession.date.toISOString()
          : new Date().toISOString(),
        city: event.city,
        venueName: event.venueName,
        category: {
          id: event.category.id,
          name: event.category.title,
        },
        sessions: event.sessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          venueName: s.venueName,
        })),
        ticketCategories: event.ticketCategories.map((tc) => ({
          id: tc.id,
          title: tc.title,
          price: tc.price,
          seats: tc.seats.map((s) => ({
            id: s.id,
            label: s.label,
            row: s.row,
            number: s.number,
            status: s.status,
          })),
        })),
      },
    },
  };
}
