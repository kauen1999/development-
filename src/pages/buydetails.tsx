import Header from "../components/principal/header/Header";
import Footer from "../components/principal/footer/Footer";
import BuyHero from "../components/buydetailsComponent/BuyHero/BuyHero";
import BuyBody from "../components/buydetailsComponent/BuyBody/BuyBody";

const BuyDetails = () => {
  return (
    <>
      <Header buyPage={true} home={true} />
      <section>
        <BuyHero />
        <BuyBody />
      </section>
      <Footer />
    </>
  );
};

export default BuyDetails;
