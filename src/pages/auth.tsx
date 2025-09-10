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

  const redirectPath =
    typeof router.query.redirect === "string" ? router.query.redirect : "/";

  const [form, setForm] = useState({
    dniName: "",
    dni: "",
    phone: "",
    birthdate: "",
  });

  const [errors, setErrors] = useState({
    dniName: "",
    dni: "",
    phone: "",
    birthdate: "",
  });

  const [finishRegister, setFinishRegister] = useState(false);
  const [validationErrorAlert, setValidationErrorAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return <p>Você precisa estar logado.</p>;

  // Helpers
  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  const normalizeName = (v: string) =>
    v.trim().replace(/\s+/g, " "); // colapsa espaços múltiplos

  const normalizePhoneE164 = (v: string): string => {
    const digits = onlyDigits(v);

    // já começa com 54 → só adiciona +
    if (digits.startsWith("54")) return `+${digits}`;

    // começa com 0 → remove zero inicial
    if (digits.startsWith("0")) return `+54${digits.slice(1)}`;

    // assume que é local (ex: 9112345678)
    return `+54${digits}`;
  };

  // Tipagem segura
  type FormKeys = keyof typeof form;

  // Validadores estilo big tech
  const validators: Record<FormKeys, (value: string) => string> = {
    dniName: (value) => {
      const normalized = normalizeName(value);
      const regex = /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/;
      if (!normalized) return "El nombre es obligatorio";
      if (normalized.length < 5) return "El nombre es demasiado corto";
      if (normalized.length > 100) return "El nombre es demasiado largo";
      if (!regex.test(normalized))
        return "Debe ingresar nombre y apellido válidos (solo letras y espacios)";
      return "";
    },
    dni: (value) => {
      const digits = onlyDigits(value);
      if (!/^\d{7,8}$/.test(digits))
        return "El DNI debe tener 7 u 8 dígitos numéricos";
      if (/^(\d)\1+$/.test(digits))
        return "El DNI no puede ser una secuencia repetida";
      if (digits.startsWith("0"))
        return "El DNI no puede comenzar con 0";
      return "";
    },
    phone: (value) => {
      const normalized = normalizePhoneE164(value);
      const digits = onlyDigits(normalized);

      if (!digits.startsWith("54"))
        return "El teléfono debe ser argentino (código 54)";

      if (!(digits.length === 12 || digits.length === 13))
        return "El teléfono debe tener 12 (fijo) o 13 (celular) dígitos";

      if (digits.length === 13 && digits[2] !== "9")
        return "Para celulares debe ser +549…";

      if (/^(\d)\1+$/.test(digits))
        return "El teléfono no puede ser repetido";

      return "";
    },
    birthdate: (value) => {
      if (!value) return "La fecha de nacimiento es obligatoria";
      const date = new Date(value);
      if (isNaN(date.getTime())) return "La fecha no es válida";

      const now = new Date();
      const year = date.getFullYear();
      const currentYear = now.getFullYear();

      const birthdayThisYear = new Date(date);
      birthdayThisYear.setFullYear(currentYear);

      const age =
        currentYear - year - (now < birthdayThisYear ? 1 : 0);

      if (year > currentYear) return "El año no puede ser mayor al actual";
      if (age < 13) return "Debes tener al menos 13 años";
      if (age > 120) return "Edad máxima permitida es 120 años";
      return "";
    },
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    const key = name as FormKeys;
    const errorMsg = validators[key](value);
    setErrors((prev) => ({ ...prev, [key]: errorMsg }));
  };

  const validateForm = () => {
    const newErrors: typeof errors = {
      dniName: validators.dniName(form.dniName),
      dni: validators.dni(form.dni),
      phone: validators.phone(form.phone),
      birthdate: validators.birthdate(form.birthdate),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((err) => err === "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrorAlert(false);
    setError(null);

    if (!validateForm()) {
      setValidationErrorAlert(true);
      return;
    }

    const payload = {
      ...form,
      dniName: normalizeName(form.dniName),
      dni: onlyDigits(form.dni),
      phone: normalizePhoneE164(form.phone),
    };

    completeProfile.mutate(payload, {
      onSuccess: async () => {
        await update();
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
                <h1 className="mb-5 text-4xl font-bold">
                  Completa tu información
                </h1>
                <form onSubmit={handleSubmit}>
                  {validationErrorAlert && (
                    <div className="alert alert-error shadow-lg mb-2">
                      <span>¡Error! Verifica que los datos sean válidos.</span>
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
                    {errors.dniName && (
                      <p className="text-error text-sm">{errors.dniName}</p>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">DNI</span>
                    </label>
                    <input
                      type="text"
                      name="dni"
                      placeholder="Documento Nacional de Identidad"
                      className="input-bordered input text-black"
                      value={form.dni}
                      onChange={handleChange}
                      required
                    />
                    {errors.dni && (
                      <p className="text-error text-sm">{errors.dni}</p>
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Teléfono</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="Ej: 9112345678 o 01134567890"
                      className="input-bordered input text-black"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                    {errors.phone && (
                      <p className="text-error text-sm">{errors.phone}</p>
                    )}
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
                    {errors.birthdate && (
                      <p className="text-error text-sm">{errors.birthdate}</p>
                    )}
                  </div>
                  <div className="form-control mt-6">
                    <button
                      className="btn-warning btn"
                      type="submit"
                      disabled={completeProfile.isLoading}
                    >
                      {completeProfile.isLoading
                        ? "Guardando..."
                        : "Finalizar registro"}
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
                  Al utilizar nuestros servicios, usted acepta y reconoce haber
                  leído y entendido nuestros términos y condiciones
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
