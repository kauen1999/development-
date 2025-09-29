// src/pages/500.tsx
import Head from "next/head";
import { MdError } from "react-icons/md";

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Error del Servidor - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <MdError className="text-4xl text-red-500" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Error del Servidor (500)</h1>
          <p className="text-base text-gray-600 mb-6">
            Lo sentimos, ocurrió un error inesperado. Intentá nuevamente en unos momentos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
          >
            <MdError className="text-xl" />
            Intentar de Nuevo
          </button>
        </div>
      </main>
    </>
  );
}
