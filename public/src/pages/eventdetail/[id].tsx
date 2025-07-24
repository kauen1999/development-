import React from "react";
import { type NextPage } from "next";
import Details from "../../components/details/details/Details";
import HeroD from "../../components/details/hero/HeroD";
import Footer from "../../components/principal/footer/Footer";
import { StaticImageData } from "next/image";

interface Props {
  picture: StaticImageData;
  artist: string;
  date: string;
}

const EventDetail: NextPage<Props> = ({ picture, artist, date }) => {
  return (
    <>
      <HeroD picture={picture} artist={artist} date={date} />
      <Details artist={artist} />
      <Footer />
    </>
  );
};

export default EventDetail;

export async function getServerSideProps(context: {
  query: {
    picture: StaticImageData;
    artist: string;
    date: string;
  };
}) {
  return {
    props: {
      picture: context.query.picture,
      artist: context.query.artist,
      date: context.query.date,
    },
  };
}
