import React from "react";
import { type NextPage } from "next";
import Details from "../components/details/details/Details";
import HeroD from "../components/details/hero/HeroD";
import Footer from "../components/principal/footer/Footer";

const EventDetail: NextPage = () => {
  return (
    <>
      <HeroD />
      <Details />
      <Footer />
    </>
  );
};

export default EventDetail;
