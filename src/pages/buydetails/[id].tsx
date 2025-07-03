import Header from "../../components/principal/header/Header";
import Footer from "../../components/principal/footer/Footer";
import BuyHero from "../../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../../components/buydetailsComponent/BuyBody/BuyBody";
import { type NextPage } from "next";
import { StaticImageData } from "next/image";

interface Props {
  foto: StaticImageData;
  titulo: string;
  horas: string;
  fecha: string;
  precio: string;
  duracion: string;
  ubicacion: string;
  ciudad: string;
}

const BuyDetails: NextPage<Props> = ({
  foto,
  titulo,
  horas,
  fecha,
  precio,
  duracion,
  ubicacion,
  ciudad,
}) => {
  return (
    <>
      <Header buyPage={true} home={true} />
      <section>
        <BuyHero foto={foto} titulo={titulo} />
        <BuyBody foto={foto} titulo={titulo} />
      </section>
      <Footer />
    </>
  );
};

export default BuyDetails;

export async function getServerSideProps(context: {
  query: {
    foto: StaticImageData;
    titulo: string;
    horas: string;
    fecha: string;
    precio: string;
    duracion: string;
    ubicacion: string;
    ciudad: string;
  };
}) {
  console.log(context.query);
  // returns { id: episode.itunes.episode, title: episode.title}

  //you can make DB queries using the data in context.query
  return {
    props: {
      foto: context.query.foto,
      titulo: context.query.titulo,
      horas: context.query.horas,
      fecha: context.query.fecha,
      precio: context.query.precio,
      duracion: context.query.duracion,
      ubicacion: context.query.ubicacion,
      ciudad: context.query.ciudad,
    },
  };
}
