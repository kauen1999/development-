// src/pages/buydetails/[slug].tsx
import Header from "../../components/principal/header/Header";
import Footer from "../../components/principal/footer/Footer";
import BuyHero from "../../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../../components/BuyBody/BuyBody"; // ✅ agora só 1

import type { GetServerSidePropsContext, NextPage } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { prisma } from "@/lib/prisma";
import { SessionTicketingType, OrderStatus } from "@prisma/client";

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
  sessions: { id: string; slug: string; date: string; venueName: string }[]; // ✅ sessions
  ticketCategories: { id: string; title: string; price: number; seats: SeatDTO[] }[];
  category: { id: string; name: string };
  type: "SEATED"; // ✅ discriminador
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
  type: "GENERAL"; // ✅ discriminador
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
      <Header minimal />
      <section>
        <BuyHero
          foto={common.img ?? "/banner.jpg"}
          titulo={common.title}
          fecha={fecha}
          horas={horas}
          ubicacion={common.venueName}
          ciudad={common.city}
        />
        <BuyBody event={props.event} />
      </section>
      <Footer />
    </>
  );
};

export default BuyDetails;

// ==========================
// getServerSideProps ajustado
// ==========================
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const slug = context.query.slug as string;
  if (!slug) return { notFound: true };

  let base = await prisma.event.findUnique({
    where: { slug },
    include: {
      category: true,
      eventSessions: {
        orderBy: { dateTimeStart: "asc" },
      },
    },
  });

  let firstSession;

  if (base) {
    firstSession = base.eventSessions[0];
  } else {
    const sessionDetail = await prisma.eventSession.findUnique({
      where: { slug },
      include: {
        event: { include: { category: true, eventSessions: true } },
        ticketCategories: true,
        seats: true,
      },
    });
    if (!sessionDetail) return { notFound: true };
    base = sessionDetail.event;
    firstSession = sessionDetail;
  }

  if (!base || !firstSession) return { notFound: true };

  const isSeated = firstSession.ticketingType === SessionTicketingType.SEATED;

  if (isSeated) {
    const sessionDetail = await prisma.eventSession.findUnique({
      where: { id: firstSession.id },
      include: { ticketCategories: true, seats: true },
    });
    if (!sessionDetail) return { notFound: true };

    const seatsByCategory = new Map<string, SeatDTO[]>();
    for (const s of sessionDetail.seats) {
      const catId = s.ticketCategoryId ?? "UNASSIGNED";
      const list = seatsByCategory.get(catId) ?? [];
      list.push({
        id: s.id,
        label: s.labelFull,
        row: s.rowName,
        number: s.number ?? null,
        status: s.status as SeatStatusDTO,
      });
      seatsByCategory.set(catId, list);
    }

    const ticketCategories = sessionDetail.ticketCategories.map((tc) => ({
      id: tc.id,
      title: tc.title,
      price: tc.price,
      seats: seatsByCategory.get(tc.id) ?? [],
    }));

    const eventSeated: EventSeated = {
      id: base.id,
      name: base.name,
      image: base.image ?? null,
      date: firstSession.dateTimeStart.toISOString(),
      city: firstSession.city,
      venueName: firstSession.venueName,
      sessions: base.eventSessions.map((s) => ({
        id: s.id,
        slug: s.slug,
        date: s.dateTimeStart.toISOString(),
        venueName: s.venueName,
      })),
      ticketCategories,
      category: { id: base.category.id, name: base.category.title },
      type: "SEATED", // ✅
    };

    return { props: { kind: "SEATED", event: eventSeated } as PageProps };
  }

  const sessionWithCats = await prisma.eventSession.findUnique({
    where: { id: firstSession.id },
    include: { ticketCategories: true },
  });
  if (!sessionWithCats) return { notFound: true };

  const categories: GeneralCategory[] = await Promise.all(
    sessionWithCats.ticketCategories.map(async (tc) => {
      const usedAgg = await prisma.orderItem.aggregate({
        where: {
          ticketCategoryId: tc.id,
          order: {
            eventId: base.id,
            eventSessionId: firstSession.id,
            status: { in: [OrderStatus.PENDING, OrderStatus.PAID] },
          },
        },
        _sum: { qty: true },
      });

      const vendidosOuPendentes = usedAgg._sum.qty ?? 0;
      const disponivel = Math.max(0, (tc.capacity ?? 0) - vendidosOuPendentes);

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
    city: firstSession.city,
    venueName: firstSession.venueName,
    eventSessionId: firstSession.id,
    sessionDateISO: firstSession.dateTimeStart.toISOString(),
    categories,
    type: "GENERAL",
  };

  return { props: { kind: "GENERAL", event: eventGeneral } as PageProps };
}
