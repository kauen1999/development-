import React from "react";
import Header from "../principal/header/Header";
import Footer from "../principal/footer/Footer";
import Link from "next/link";
import MyActiveEvents from "./components/MyActiveEvents";
import { MdAdd, MdQrCode, MdDashboard } from "react-icons/md";

const DashboardContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header minimal />
      
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header do Dashboard */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <MdDashboard className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Panel de administración de EntradaMaster</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/event/create"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
              >
                <MdAdd className="text-xl" />
                Crear Evento
              </Link>

              <Link
                href="/scanner"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-all hover:bg-green-700 hover:shadow-lg"
              >
                <MdQrCode className="text-xl" />
                Validar Tickets
              </Link>
            </div>
          </div>

          {/* Grid de métricas - apenas os 3 primeiros cards 
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <NewFunctions />
            <Visitors />
            <UserSignUp />
          </div>*/}

          {/* Mis Eventos em linha separada */}
          <div className="mb-8">
            <MyActiveEvents />
          </div>

          {/* Grid de conteúdo principal 
          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LatestCostumers />
            <AdquisitionsOverview />
          </div>*/}

          {/* Transacciones 
          <div className="grid grid-cols-1 gap-6">
            <LastTransactios />
          </div>*/}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardContent;
