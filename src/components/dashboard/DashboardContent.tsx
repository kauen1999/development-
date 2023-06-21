import React from "react";
import Header from "../principal/header/Header";
import Footer from "../principal/footer/Footer";
import LastTransactios from "./components/LastTransactions";
import AdquisitionsOverview from "./components/AdquisitionsOverview";
import LatestCostumers from "./components/LatestCostumers";
import NewFunctions from "./components/NewFunctions";
import Visitors from "./components/Visitors";
import UserSignUp from "./components/UserSignUp";

const DashboardContent = () => {
  return (
    <div>
      <div>
        <Header home />
        <div className="flex overflow-hidden bg-white pt-5">
          <div
            id="main-content"
            className="relative h-full w-full overflow-y-auto bg-gray-50"
          >
            <main>
              <div className="px-4">
                <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <NewFunctions />
                  <Visitors />
                  <UserSignUp />
                </div>
                <div className="my-4 grid grid-cols-1 xl:gap-4 2xl:grid-cols-2">
                  <LatestCostumers />
                  <AdquisitionsOverview />
                </div>
                <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-1 2xl:grid-cols-1">
                  <LastTransactios />
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
