// src/pages/event/create.tsx
import { useRouter } from "next/router";
import Head from "next/head";
import EventForm from "@/components/forms/EventForm";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";

export default function CreatePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Crear Evento - EntradaMaster</title>
        <meta name="description" content="Crear un nuevo evento en EntradaMaster" />
      </Head>
      
      <Header />
      
      <main className="py-8">
        <EventForm
          mode="create"
          onSuccess={(id) => router.push(`/event/manage/${id}`)}
        />
      </main>
      
      <Footer />
    </div>
  );
}
