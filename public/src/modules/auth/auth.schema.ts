// src/modules/auth/schema.ts

import { z } from "zod";

// Cadastro de usuário
export const registerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 chars"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 chars"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

// Login
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 chars"),
});

//Profile
export const updateProfileSchema = z.object({
  name: z.string().optional(),
  dni: z.string().optional(),
  dniName: z.string().optional(),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  image: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
