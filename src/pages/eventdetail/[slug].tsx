import type { GetServerSideProps, NextPage } from "next";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/principal/footer/Footer";
import HeroD from "@/components/details/hero/HeroD";
import Details from "@/components/details/details/Details";

interface SessionDTO {
  id: string;
  date: string;
  venueName: string;
  city: string;
}

interface PageProps {
  event: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    description: string;
    city: string;
    venueName: string;

    dateISO: string | null;
    nextSessionId: string;
    nextVenueName: string | null;
    nextCity: string | null;

    minPrice: number | null;
    sessions: SessionDTO[];
  };
}

const EventDetailPage: NextPage<PageProps> = ({ event }) => {
  const heroDate = event.dateISO
    ? new Date(event.dateISO).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const timeStart = event.dateISO
    ? new Date(event.dateISO).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <>
      <HeroD
        picture={event.image ?? "/banner.jpg"}
        artist={event.name}
        date={heroDate}
        description={event.description}
        timeStart={timeStart}
        venueName={event.nextVenueName ?? event.venueName}
        city={event.nextCity ?? event.city}
        price={event.minPrice ?? undefined}
        buyId={event.nextSessionId} // sempre vem preenchido agora
        />
      <Details
        artist={event.name}
        slug={event.slug}
        image={event.image ?? "/banner.jpg"}
        sessions={event.sessions}
        description={event.description}
        venueName={event.venueName}
        city={event.city}
      />
      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug;
  if (typeof slug !== "string") return { notFound: true };

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      eventSessions: { orderBy: { date: "asc" } },
      ticketCategories: true,
    },
  });

  if (!event) return { notFound: true };

  const now = new Date();
  const nextSession =
    event.eventSessions.find((s) => s.date >= now) ?? event.eventSessions[0];

  if (!nextSession) {
    return { notFound: true };
  }

  const minPrice =
    event.ticketCategories.length > 0
      ? Math.min(...event.ticketCategories.map((c) => Number(c.price)))
      : null;

  return {
    props: {
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        image: event.image,
        description: event.description ?? "",
        city: event.city,
        venueName: event.venueName,
        dateISO: nextSession.date.toISOString(),
        nextSessionId: nextSession.id, // sempre válido
        nextVenueName: nextSession.venueName,
        nextCity: nextSession.city,
        minPrice,
        sessions: event.eventSessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          venueName: s.venueName,
          city: s.city,
        })),
      },
    },
  };
};

export default EventDetailPage;
