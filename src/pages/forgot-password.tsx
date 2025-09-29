// src/pages/forgot-password.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { MdEmail, MdArrowBack, MdCheckCircle, MdError } from "react-icons/md";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setMsg(data?.error || "No fue posible procesar tu solicitud.");
        setState("error");
        return;
      }
      setState("done");
      setMsg("Si ese correo existe, te enviaremos un enlace para restablecer la contraseña.");
    } catch {
      setMsg("Error de red. Inténtalo de nuevo.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Head>
        <title>Recuperar Contraseña - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="w-full max-w-md">
        {/* Header da página */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <MdEmail className="text-4xl text-white" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
            Recuperar Contraseña
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Ingresá tu correo para recibir el enlace de restablecimiento
          </p>
        </div>

        {/* Card principal */}
        <div className="rounded-xl bg-white p-6 md:p-8 shadow-lg">
          {state === "done" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <MdCheckCircle className="text-3xl text-green-500" />
              </div>
              <h2 className="mb-4 text-xl font-semibold text-green-700">¡Enlace Enviado!</h2>
              <div className="rounded-lg bg-green-50 p-4 text-green-800">
                {msg}
              </div>
              <div className="mt-6">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                >
                  <MdArrowBack className="text-xl" />
                  Volver al Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
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
                <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
                  <MdError className="text-xl text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-red-700">{msg}</p>
                  </div>
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
                    Enviar Enlace
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
      </div>
    </div>
  );
}
