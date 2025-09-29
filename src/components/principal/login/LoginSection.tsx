// src/components/principal/login/LoginSection.tsx
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, getSession } from "next-auth/react";
import concierto from "../../../../public/images/concierto.jpg";
import logo from "../../../../public/images/logo_white.png";
import { FcGoogle } from "react-icons/fc";

const LoginSection: React.FC = () => {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // reenvio de verificação (quando login bloqueia por e-mail não verificado)
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  // modal "esqueci minha senha"
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const redirectAfterLogin = async (defaultPath = "/") => {
    const session = await getSession();
    if (session?.user?.profileCompleted) {
      // Não redireciona admins automaticamente para dashboard
      // Deixa eles navegarem livremente
      router.push(defaultPath);
    } else {
      router.push(`/auth?redirect=${encodeURIComponent(defaultPath)}`);
    }
  };

  // detecta erro de e-mail não verificado (ES)
  const isEmailNotVerified = (err?: string | null): boolean => {
    if (!err) return false;
    const e = err.toLowerCase();
    return e.includes("tu correo aún no ha sido verificado") || e.includes("reenviar verificación");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendMsg(null);
    setIsSubmitting(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setIsSubmitting(false);
    if (res?.ok) {
      await redirectAfterLogin();
    } else {
      const msg =
        res?.error && isEmailNotVerified(res.error)
          ? "Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada o haz clic en «Reenviar verificación» para continuar."
          : "Login inválido.";
      setError(msg);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const callbackUrl = (router.query.callbackUrl as string) || "/";
    await signIn("google", { callbackUrl });
    setIsSubmitting(false);
  };

  // reenvio verificación — link minimalista
  const handleResend = async () => {
    if (!form.email) {
      setResendMsg("Ingresa tu correo arriba y vuelve a intentarlo.");
      return;
    }
    setResending(true);
    setResendMsg(null);
    try {
      const resp = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (!resp.ok) {
        const data: unknown = await resp.json().catch(() => ({}));
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in (data as Record<string, unknown>)
            ? String((data as { error?: unknown }).error ?? "")
            : "";
        setResendMsg(message || "No pudimos reenviar el correo ahora. Inténtalo más tarde.");
      } else {
        setResendMsg("Si ese correo existe, hemos reenviado el enlace de verificación.");
      }
    } catch {
      setResendMsg("Error de red. Inténtalo nuevamente.");
    } finally {
      setResending(false);
    }
  };

  // abrir modal "olvidaste tu contraseña?"
  const openForgot = () => {
    setFpMsg(null);
    setFpEmail(form.email); // pré-preenche com o que já digitou no login
    setShowForgot(true);
  };

  // submit do modal (pede e-mail e envia link)
  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpLoading(true);
    setFpMsg(null);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setFpMsg(data?.error || "No fue posible procesar tu solicitud.");
      } else {
        setFpMsg("Si ese correo existe, te enviaremos un enlace para restablecer la contraseña.");
      }
    } catch {
      setFpMsg("Error de red. Inténtalo de nuevo.");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <section className="flex flex-col lg:h-screen lg:flex-row">
      <div className="relative z-0 flex h-[25rem] w-full items-center justify-center lg:h-screen lg:w-1/2">
        <Image
          src={concierto}
          alt="biza"
          fill
          quality={100}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="-z-10 brightness-50 object-cover"
        />
        <Link href={"/"}>
          <div className="absolute top-6 left-6 w-[5rem]">
            <Image src={logo} alt="logo" />
          </div>
        </Link>
        <div className="z-10 mx-auto w-[90%]">
          <h2 className="text-5xl font-bold text-white lg:text-7xl">Vive los conciertos.</h2>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 bg-slate-100 px-5 py-10 lg:w-1/2">
        <div className="formulario w-full rounded-[2rem] border bg-white p-5 py-10 shadow-lg lg:max-w-lg lg:px-14 lg:pb-14 2xl:max-w-2xl">
          <h2 className="text-center text-3xl font-bold lg:text-4xl">Iniciar sesión</h2>

          <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold text-primary-100" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                className="rounded-lg border-b"
                type="email"
                id="email"
                placeholder="Tu correo aquí"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xl font-bold text-primary-100" htmlFor="password">
                Contraseña
              </label>
              <input
                className="rounded-lg border-b"
                type="password"
                id="password"
                placeholder="Tu contraseña aquí"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <div className="mt-1 text-right">
                {/* linkzinho minimalista que ABRE o modal */}
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-sm underline underline-offset-2 hover:opacity-80"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {error && (
              <div className="flex flex-col items-center gap-1 -my-1 text-center">
                <span className="text-red-500">{error}</span>

                {isEmailNotVerified(error) && (
                  <small>
                    ¿No te llegó?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
                    >
                      {resending ? "Enviando..." : "Reenviar verificación"}
                    </button>
                  </small>
                )}
                {resendMsg && <small className="text-gray-600">{resendMsg}</small>}
              </div>
            )}

            <button
              type="submit"
              className="rounded-lg bg-primary-100 py-3 text-xl font-bold text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="flex flex-col p-9">
            <button
              className="btn-warning btn my-2 flex bg-white"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-center">
                <FcGoogle className="mr-2 text-4xl" />
                <span className="text-left text-black">Iniciar Sesión con Google</span>
              </div>
            </button>
          </div>

          <Link href="/register">
            <div className="text-center text-primary-100">¿Todavía no tienes una cuenta?</div>
          </Link>
        </div>
      </div>

      {/* ===== Modal Esqueci a senha ===== */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Restablecer contraseña</h3>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={submitForgot} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium text-gray-700">
                  Correo
                </label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              {fpMsg && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-800 text-sm">
                  {fpMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="rounded-xl px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fpLoading}
                  className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {fpLoading ? "Enviando..." : "Enviar enlace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default LoginSection;
