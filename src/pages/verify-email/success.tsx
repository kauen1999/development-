// src/pages/verify-email/success.tsx
import Link from "next/link";
import Head from "next/head";
import { MdCheckCircle, MdLogin } from "react-icons/md";

export default function VerifyEmailSuccess() {
  return (
    <>
      <Head><title>E-mail Verificado - EntradaMaster</title></Head>
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl shadow-lg bg-white p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <MdCheckCircle className="text-3xl text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">¡E-mail Verificado!</h1>
          <p className="text-gray-600 mb-6">
            Tu dirección de correo fue confirmada. Ahora ya podés acceder a tu cuenta.
          </p>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
            href="/login"
          >
            <MdLogin className="text-xl" />
            Ir al Login
          </Link>
        </div>
      </main>
    </>
  );
}
