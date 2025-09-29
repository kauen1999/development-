// src/pages/verify-email/error.tsx
import Link from "next/link";
import Head from "next/head";
import { MdError, MdRefresh, MdLogin } from "react-icons/md";
import { useRouter } from "next/router";

export default function VerifyEmailError() {
  const router = useRouter();
  const { reason } = router.query;

  const getErrorMessage = (reason: string | string[] | undefined) => {
    switch (reason) {
      case "NOT_FOUND":
        return "El enlace de verificación no es válido o ya fue usado.";
      case "USED":
        return "Este enlace de verificación ya fue utilizado.";
      case "EXPIRED":
        return "El enlace de verificación expiró. Solicitá uno nuevo.";
      default:
        return "Hubo un error al verificar tu email. Intentá nuevamente.";
    }
  };

  return (
    <>
      <Head>
        <title>Error de Verificación - EntradaMaster</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl shadow-lg bg-white p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <MdError className="text-3xl text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Error de Verificación</h1>
          <p className="text-gray-600 mb-6">
            {getErrorMessage(reason)}
          </p>
          
          <div className="space-y-3">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg w-full justify-center"
              href="/verify-email/resend-verification"
            >
              <MdRefresh className="text-xl" />
              Reenviar Verificación
            </Link>
            
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-700 hover:shadow-lg w-full justify-center"
              href="/login"
            >
              <MdLogin className="text-xl" />
              Ir al Login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
