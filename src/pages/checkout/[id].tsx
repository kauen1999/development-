import React from "react";
import { type NextPage } from "next";
import CheckoutContent from "../../components/checkout/CheckoutContent";
import Footer from "../../components/principal/footer/Footer";
import Header from "../../components/principal/header/Header";
import { StaticImageData } from "next/image";

interface Props {
  title: string;
  price: number;
  sector: string;
  cant: number;
  picture: StaticImageData;
}

const Checkout: NextPage<Props> = ({ title, price, sector, cant, picture }) => {
  return (
    <div>
      <Header buyPage={true} home={true} />

      <section>
        <CheckoutContent
          title={title}
          price={price}
          sector={sector}
          cant={cant}
          picture={picture}
        />
      </section>
      <Footer />
    </div>
  );
};

export default Checkout;

export async function getServerSideProps(context: {
  query: {
    picture: StaticImageData;
    price: number;
    cant: number;
    title: string;
    sector: string;
  };
}) {
  console.log(context.query);
  // returns { id: episode.itunes.episode, title: episode.title}

  //you can make DB queries using the data in context.query
  return {
    props: {
      title: context.query.title,
      price: context.query.price,
      sector: context.query.sector,
      cant: context.query.cant,
      picture: context.query.picture,
    },
  };
}
