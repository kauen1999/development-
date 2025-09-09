// src/modules/auth/schema.ts
import { z } from "zod";

// Registration schema: name, email, password + confirmation
export const registerSchema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
    email: z.string().email("Email inválido."),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// Login schema: email + password
export const loginSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Complete profile after social login
export const completeProfileSchema = z.object({
  dniName: z.string().min(3, "Nome do documento é obrigatório."),
  dni: z.string().min(5, "DNI deve ter pelo menos 5 caracteres."),
  phone: z.string().min(8, "Telefone inválido."),
  birthdate: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Data de nascimento inválida.",
    }),
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

// Update name only
export const modifyNameSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
});
export type ModifyNameInput = z.infer<typeof modifyNameSchema>;

// Update document name
export const modifyDniNameSchema = z.object({
  id: z.string().min(1),
  dniName: z.string().min(3, "Nome do documento deve ter pelo menos 3 caracteres."),
});
export type ModifyDniNameInput = z.infer<typeof modifyDniNameSchema>;

// Update DNI number
export const modifyDniSchema = z.object({
  id: z.string().min(1),
  dni: z.string().min(5, "DNI deve ter pelo menos 5 caracteres."),
});
export type ModifyDniInput = z.infer<typeof modifyDniSchema>;

// Update phone number
export const modifyPhoneSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(8, "Telefone inválido."),
});
export type ModifyPhoneInput = z.infer<typeof modifyPhoneSchema>;

// Update birthdate
export const modifyBirthdateSchema = z.object({
  id: z.string().min(1),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});
export type ModifyBirthdateInput = z.infer<typeof modifyBirthdateSchema>;

// Fetch user by ID (string, não necessariamente UUID)
export const getUserByIdSchema = z.string().min(1);
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;

// ====== SCHEMAS DE VERIFICAÇÃO DE E-MAIL ======
export const requestEmailVerificationSchema = z.object({
  email: z.string().email("Email inválido."),
});
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Token inválido."),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ====== SCHEMAS DE RESET DE SENHA (NOVOS) ======
export const requestPasswordResetSchema = z.object({
  email: z.string().email("Email inválido."),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(10, "Token inválido."),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme sua senha."),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
