// src/pages/forgot-password.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";

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
    <>
      <Head>
        <title>Recuperar contraseña • Entrada Master</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl shadow-md bg-white p-8">
          <h1 className="text-xl font-semibold mb-2">Recuperar contraseña</h1>
          <p className="text-gray-600 mb-6">
            Ingresa tu correo para recibir el enlace de restablecimiento.
          </p>

          {state === "done" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
              {msg}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              {state === "error" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full rounded-xl bg-black text-white py-2 hover:opacity-90 transition disabled:opacity-60"
              >
                {state === "loading" ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-700 hover:underline">
              Volver al login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
