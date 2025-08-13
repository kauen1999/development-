// src/pages/auth.tsx
import React, { useState } from "react";
import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { trpc } from "@/utils/trpc";

const Auth: NextPage = () => {
  const { data: session } = useSession();
  const completeProfile = trpc.auth.completeProfile.useMutation();
  const router = useRouter();
  const { update } = useSession();
  
  // Captura o "redirect" que veio no query params
  const redirectPath = typeof router.query.redirect === "string" ? router.query.redirect : "/";

  // Estados do formulário
  const [form, setForm] = useState({
    dniName: "",
    dni: "",
    phone: "",
    birthdate: "",
  });
  const [finishRegister, setFinishRegister] = useState(false);
  const [validationErrorAlert, setValidationErrorAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se não autenticado
  if (!session) return <p>Você precisa estar logado.</p>;

  // Atualiza estado do form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Validação simples
  const validateForm = () => {
    return form.dniName && form.dni && form.phone && form.birthdate;
  };

  // Submit
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrorAlert(false);
    setError(null);

    if (!validateForm()) {
      setValidationErrorAlert(true);
      return;
    }

    completeProfile.mutate(form, {
      onSuccess: async () => {
        // 🔄 Atualiza a sessão para refletir profileCompleted = true
        await update();
        
        // Redireciona para rota original após completar o perfil
        router.push(redirectPath || "/");
      },
      onError: (err) => setError(err.message || "Erro ao completar perfil"),
    });
  };

  return (
    <div>
      <div
        className="hero h-[100vh]"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1")`,
        }}
      >
        <div className="hero-overlay bg-black bg-opacity-60"></div>
        <div className="hero-content text-center text-neutral-content">
          <div className="max-w-lg">
            {finishRegister ? (
              <>
                <h1 className="mb-5 text-4xl font-bold">Completa tu información</h1>
                <form onSubmit={handleSubmit}>
                  {validationErrorAlert && (
                    <div className="alert alert-error shadow-lg mb-2">
                      <span>¡Error! Rellena los datos faltantes</span>
                    </div>
                  )}
                  {error && (
                    <div className="alert alert-error shadow-lg mb-2">
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nombre completo</span>
                    </label>
                    <input
                      type="text"
                      name="dniName"
                      placeholder="Nombre completo"
                      className="input-bordered input text-black"
                      value={form.dniName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">DNI</span>
                    </label>
                    <input
                      type="text"
                      name="dni"
                      placeholder="ID Documento de identidad"
                      className="input-bordered input text-black"
                      value={form.dni}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Teléfono</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="Numero de teléfono"
                      className="input-bordered input text-black"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Fecha de nacimiento</span>
                    </label>
                    <input
                      type="date"
                      name="birthdate"
                      className="input-bordered input text-black"
                      value={form.birthdate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-control mt-6">
                    <button
                      className="btn-warning btn"
                      type="submit"
                      disabled={completeProfile.isLoading}
                    >
                      {completeProfile.isLoading ? "Salvando..." : "Finalizar registro"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h1 className="mb-5 text-4xl font-bold">
                  ¡No esperes más, adquiere tus entradas hoy!
                </h1>
                <p className="mb-5">
                  Al utilizar nuestros servicios, usted acepta y reconoce haber leído y entendido nuestros términos y condiciones
                </p>
                <button
                  className="btn-warning btn"
                  onClick={() => setFinishRegister(true)}
                >
                  Empieza Ahora
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
