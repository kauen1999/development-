// src/pages/eventdetail/[slug].tsx
import type { GetServerSideProps, NextPage } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";
import HeroD from "@/components/details/hero/HeroD";
import Details from "@/components/details/details/Details";

interface PageProps {
  event: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    date: string;
    city: string;
    venueName: string;
    sessions: {
      id: string;
      date: string;
      venueName: string;
      city: string;
    }[];
  };
}

const EventDetailPage: NextPage<PageProps> = ({ event }) => {
  return (
    <>
      <Header />
      <HeroD
        picture={event.image ?? "/banner.jpg"}
        artist={event.name}
        date={new Date(event.date).toLocaleDateString("es-AR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      />
      <Details
        artist={event.name}
        slug={event.slug}
        image={event.image ?? "/banner.jpg"}
        sessions={event.sessions}
      />
      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug;

  if (typeof slug !== "string") {
    return { notFound: true };
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      sessions: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!event) {
    return { notFound: true };
  }

  return {
    props: {
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        image: event.image,
        date: event.sessions?.[0]?.date ? new Date(event.sessions[0].date).toISOString() : "",
        city: event.city,
        venueName: event.venueName,
        sessions: event.sessions.map((s) => ({
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
