// src/modules/auth/schema.ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres."),
  confirmPassword: z.string().min(8, "Confirme sua senha."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

export const completeProfileSchema = z.object({
  dniName: z.string().min(3, "Nome do documento é obrigatório."),
  dni: z.string().min(5, "DNI deve ter pelo menos 5 caracteres."),
  phone: z.string().min(8, "Telefone inválido."),
  birthdate: z.string().refine(val => !Number.isNaN(Date.parse(val)), "Data de nascimento inválida."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
