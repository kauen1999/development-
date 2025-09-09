// src/pages/reset-password.tsx
import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useMemo(() => {
    const t = router.query.token;
    return typeof t === "string" ? t : "";
  }, [router.query.token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; reason?: string } | null;
        setMsg(data?.error || data?.reason || "No fue posible restablecer tu contraseña.");
        setState("error");
        return;
      }
      setState("done");
      setMsg("Contraseña restablecida con éxito. Ya puedes iniciar sesión.");
    } catch {
      setMsg("Error de red. Inténtalo de nuevo.");
      setState("error");
    }
  };

  return (
    <>
      <Head>
        <title>Definir nueva contraseña • Entrada Master</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl shadow-md bg-white p-8">
          <h1 className="text-xl font-semibold mb-2">Definir nueva contraseña</h1>
          <p className="text-gray-600 mb-6">
            Crea tu nueva contraseña para acceder a tu cuenta.
          </p>

          {!token ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Falta el token en la URL.
            </div>
          ) : state === "done" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                {msg}
              </div>
              <div className="text-center">
                <Link href="/login" className="underline underline-offset-2">
                  Ir al login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  placeholder="********"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  placeholder="********"
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
                {state === "loading" ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
