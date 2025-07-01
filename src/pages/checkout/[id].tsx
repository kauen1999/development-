import React, { useEffect } from "react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";
import CheckoutContent from "../../components/checkout/CheckoutContent";
import Footer from "../../components/principal/footer/Footer";
import Header from "../../components/principal/header/Header";
import sampleImage from "../../public/sample.jpg"; 

import { StaticImageData } from "next/image";

interface Props {
  title: string;
  price: number;
  sector: string;
  cant: number;
  picture: StaticImageData;
  loggedIn: boolean;
}

const Checkout: NextPage<Props> = ({ title, price, sector, cant, picture, loggedIn }) => {
  const router = useRouter();

  useEffect(() => {
    if (loggedIn) {
    
      const timer = setTimeout(() => {
        router.push("/confirmation");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loggedIn, router]);

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

export async function getServerSideProps(context: any) {
  const { req } = context;
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
      title: context.query.title || "",
      picture: sampleImage,
      loggedIn: true,
    },
  };
}
