// src/pages/verify-email/success.tsx
import Link from "next/link";
import Head from "next/head";

export default function VerifyEmailSuccess() {
  return (
    <>
      <Head><title>E-mail verificado • Entrada Master</title></Head>
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl shadow-md bg-white p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">E-mail verificado com sucesso</h1>
          <p className="text-gray-600 mb-6">
            Seu endereço de e-mail foi confirmado. Agora você já pode acessar sua conta.
          </p>
          <Link
            className="inline-block rounded-xl px-4 py-2 border border-gray-200 hover:bg-gray-100 transition"
            href="/login"
          >
            Ir para login
          </Link>
        </div>
      </main>
    </>
  );
}
