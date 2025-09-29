// src/pages/verify-email/resend-verification.tsx
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { MdEmail, MdArrowBack } from "react-icons/md";

type State = "idle" | "loading" | "success" | "error";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message || "Error al enviar. Intentá nuevamente.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Error de red. Intentá nuevamente.");
      setState("error");
    }
  }

  return (
    <>
      <Head>
        <title>Reenviar Verificación - EntradaMaster</title>
      </Head>

      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl shadow-lg bg-white p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <MdEmail className="text-2xl text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reenviar Verificación</h1>
            <p className="text-gray-600 mt-2">
              Ingresá tu e-mail de registro para reenviar el enlace de confirmación.
            </p>
          </div>

          {state === "success" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <MdEmail className="text-lg text-green-600" />
              </div>
              <p className="font-medium">¡Enviado!</p>
              <p className="text-sm">Si ese e-mail existe, te enviaremos un enlace de verificación en instantes.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdEmail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-100 outline-none transition-colors"
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>

              {state === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === "loading" ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <MdEmail className="text-xl" />
                    Reenviar Enlace
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-100 transition-colors"
            >
              <MdArrowBack className="text-lg" />
              Volver al Login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
