// src/pages/buydetails/[slug].tsx
import Header from "../../components/principal/header/Header";
import Footer from "../../components/principal/footer/Footer";
import BuyHero from "../../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../../components/buydetailsComponent/BuyBody/BuyBody"; // SEATED
import BuyBodyGeneral from "../../components/buydetailsComponent/BuyBodyGeneral/BuyBodyGeneral"; // GENERAL

import type { GetServerSidePropsContext, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";

// ----- Types -----
type SeatStatusDTO = "AVAILABLE" | "RESERVED" | "SOLD";

interface SeatDTO {
  id: string;
  label: string;
  row: string | null;
  number: number | null;
  status: SeatStatusDTO;
}

interface EventSeated {
  id: string;
  name: string;
  image: string | null;
  date: string;
  city: string;
  venueName: string;
  eventSessions: { id: string; date: string; venueName: string }[];
  ticketCategories: { id: string; title: string; price: number; seats: SeatDTO[] }[];
  category: { id: string; name: string };
}

interface GeneralCategory {
  id: string;
  title: string;
  price: number;
  capacity: number;
}

interface EventGeneral {
  id: string;
  name: string;
  image: string | null;
  city: string;
  venueName: string;
  eventSessionId: string;
  sessionDateISO?: string;
  categories: GeneralCategory[];
}

type PageProps =
  | { kind: "SEATED"; event: EventSeated }
  | { kind: "GENERAL"; event: EventGeneral };

const BuyDetails: NextPage<PageProps> = (props) => {
  const common =
    props.kind === "SEATED"
      ? {
          img: props.event.image,
          title: props.event.name,
          city: props.event.city,
          venueName: props.event.venueName,
          dateISO: props.event.date,
        }
      : {
          img: props.event.image,
          title: props.event.name,
          city: props.event.city,
          venueName: props.event.venueName,
          dateISO: props.event.sessionDateISO ?? new Date().toISOString(),
        };

  const fecha = new Date(common.dateISO).toLocaleDateString();
  const horas = new Date(common.dateISO).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <Header buyPage={true} home={true} />
      <section>
        <BuyHero
          foto={common.img ?? "/banner.jpg"}
          titulo={common.title}
          fecha={fecha}
          horas={horas}
          ubicacion={common.venueName}
          ciudad={common.city}
        />

        {props.kind === "SEATED" ? (
          <BuyBody event={props.event} />
        ) : (
          <BuyBodyGeneral event={props.event} />
        )}
      </section>
      <Footer />
    </>
  );
};

export default BuyDetails;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const slug = context.query.slug as string;
  if (!slug) return { notFound: true };

  const base = await prisma.event.findUnique({
    where: { slug },
    include: {
      eventSessions: { orderBy: { date: "asc" } },
      ticketCategories: true,
      category: true,
    },
  });

  if (!base || base.eventSessions.length === 0) return { notFound: true };

  const [firstEventSession] = base.eventSessions;
  if (!firstEventSession) return { notFound: true };
  const firstDateISO = firstEventSession.date.toISOString();

  // 🔹 SEATED event → entrega ticketCategories + seats completos
  if (base.eventType === "SEATED") {
    const withSeats = await prisma.event.findUnique({
      where: { slug },
      include: { ticketCategories: { include: { seats: true } } }, // pega seats com row/number/status
    });

    const ticketCategories =
      withSeats?.ticketCategories.map((tc) => ({
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
      })) ?? [];

    const eventSeated: EventSeated = {
      id: base.id,
      name: base.name,
      image: base.image ?? null,
      date: firstDateISO,
      city: base.city,
      venueName: base.venueName,
      eventSessions: base.eventSessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        venueName: s.venueName,
      })),
      ticketCategories,
      category: {
        id: base.category.id,
        name: base.category.title,
      },
    };

    return { props: { kind: "SEATED", event: eventSeated } as PageProps };
  }

  // 🔹 GENERAL event (INALTERADO)
  const categories: GeneralCategory[] = await Promise.all(
    base.ticketCategories.map(async (tc) => {
      const usedCount = await prisma.orderItem.aggregate({
        where: {
          ticketCategoryId: tc.id,
          order: {
            eventId: base.id,
            eventSessionId: firstEventSession.id,
            status: { in: ["PENDING", "PAID"] },
          },
        },
        _sum: { qty: true },
      });

      const vendidosOuPendentes = usedCount._sum.qty ?? 0;
      const disponivel = Math.max(0, tc.capacity - vendidosOuPendentes);

      return {
        id: tc.id,
        title: tc.title,
        price: tc.price,
        capacity: disponivel,
      };
    })
  );

  const eventGeneral: EventGeneral = {
    id: base.id,
    name: base.name,
    image: base.image ?? null,
    city: base.city,
    venueName: base.venueName,
    eventSessionId: firstEventSession.id,
    sessionDateISO: firstDateISO,
    categories,
  };

  return { props: { kind: "GENERAL", event: eventGeneral } as PageProps };
}
