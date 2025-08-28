// src/pages/verify-email/resend-verification.tsx
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

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
        setErrorMsg(data?.message || "Falha ao enviar. Tente novamente.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Falha de rede. Tente novamente.");
      setState("error");
    }
  }

  return (
    <>
      <Head>
        <title>Reenviar verificação • Entrada Master</title>
      </Head>

      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl shadow-md bg-white p-8">
          <h1 className="text-xl font-semibold mb-2">Reenviar verificação</h1>
          <p className="text-gray-600 mb-6">
            Informe o seu e-mail de cadastro para reenviar o link de confirmação.
          </p>

          {state === "success" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
              Se esse e-mail existir, enviaremos um link de verificação em instantes.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail
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
                  placeholder="voce@exemplo.com"
                />
              </div>

              {state === "error" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full rounded-xl bg-black text-white py-2 hover:opacity-90 transition disabled:opacity-60"
              >
                {state === "loading" ? "Enviando..." : "Reenviar link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-700 hover:underline">
              Voltar ao login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
