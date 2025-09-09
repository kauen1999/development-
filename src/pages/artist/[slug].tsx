// src/pages/artist/[slug].tsx
import type { GetServerSideProps, NextPage } from "next";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/principal/footer/Footer";
import HeroD from "@/components/details/hero/HeroD";
import Details from "@/components/details/details/Details";

interface SessionDTO {
  id: string;
  slug: string;
  date: string;
  venueName: string;
  city: string;
  eventName: string;
  eventSlug: string;
  eventImage: string | null;
}

interface PageProps {
  artist: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    bio: string | null;
    sessions: SessionDTO[];
  };
}

const ArtistDetailPage: NextPage<PageProps> = ({ artist }) => {
  return (
    <>
      {/* Hero apenas com o nome e a imagem */}
      <HeroD
        picture={artist.image ?? "/banner.jpg"}
        artist={artist.name}
        date=""
        description={artist.bio ?? ""}
        timeStart={undefined}
        venueName=""
        city=""
        price={undefined}
        buyId=""
        minimalHeader 
      />

      {/* Lista de sessões do artista */}
      <Details
        artist={artist.name}
        sessions={artist.sessions.map((s) => ({
          id: s.id,
          slug: s.slug, // 👈 usado para navegação em /buydetails/[slug]
          date: s.date,
          venueName: s.venueName,
          city: s.city,
        }))}
        description={artist.bio ?? ""}
        venueName=""
        city=""
      />

      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context
) => {
  const slug = context.params?.slug;
  if (typeof slug !== "string") return { notFound: true };

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      appearances: {
        include: {
          session: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  if (!artist) return { notFound: true };

  // ✅ Apenas eventos publicados
  const sessions = artist.appearances
    .filter((a) => a.session && a.session.event.status === "PUBLISHED")
    .map((a) => {
      const s = a.session;
      return {
        id: s.id,
        slug: s.slug,
        date: s.dateTimeStart.toISOString(),
        venueName: s.venueName,
        city: s.city,
        eventName: s.event.name,
        eventSlug: s.event.slug,
        eventImage: s.event.image,
      };
    });

  return {
    props: {
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        image: artist.image,
        bio: artist.bio,
        sessions,
      },
    },
  };
};

export default ArtistDetailPage;
