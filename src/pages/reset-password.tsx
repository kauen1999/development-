// src/pages/reset-password.tsx
import React, { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { MdLock, MdArrowBack, MdCheckCircle, MdError, MdVisibility, MdVisibilityOff } from "react-icons/md";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Head>
        <title>Definir Nueva Contraseña - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="w-full max-w-md">
        {/* Header da página */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
            <MdLock className="text-4xl text-white" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
            Definir Nueva Contraseña
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Creá tu nueva contraseña para acceder a tu cuenta
          </p>
        </div>

        {/* Card principal */}
        <div className="rounded-xl bg-white p-6 md:p-8 shadow-lg">
          {!token ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <MdError className="text-3xl text-red-500" />
              </div>
              <h2 className="mb-4 text-xl font-semibold text-red-700">Token Inválido</h2>
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                Falta el token en la URL. Verificá el enlace que recibiste por correo.
              </div>
              <div className="mt-6">
                <Link 
                  href="/forgot-password" 
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                >
                  <MdArrowBack className="text-xl" />
                  Solicitar Nuevo Enlace
                </Link>
              </div>
            </div>
          ) : state === "done" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <MdCheckCircle className="text-3xl text-green-500" />
              </div>
              <h2 className="mb-4 text-xl font-semibold text-green-700">¡Contraseña Actualizada!</h2>
              <div className="rounded-lg bg-green-50 p-4 text-green-800">
                {msg}
              </div>
              <div className="mt-6">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                >
                  <MdArrowBack className="text-xl" />
                  Ir al Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-100 outline-none transition-colors"
                    placeholder="Ingresá tu nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MdLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-100 outline-none transition-colors"
                    placeholder="Confirmá tu nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <MdLock className="text-xl" />
                    Guardar Contraseña
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
