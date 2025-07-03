import React from "react";
import { type NextPage, type GetServerSidePropsContext } from "next";
import CheckoutContent from "../../components/checkout/CheckoutContent";
import Footer from "../../components/principal/footer/Footer";
import Header from "../../components/principal/header/Header";
import type { StaticImageData } from "next/image";
import { getSession } from "next-auth/react";

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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, query } = context;

  const session = await getSession({ req });

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      title: query.title ?? "",
      price: Number(query.price ?? 0),
      sector: query.sector ?? "",
      cant: Number(query.cant ?? 1),
      picture: query.picture ?? "",
    },
  };
}
