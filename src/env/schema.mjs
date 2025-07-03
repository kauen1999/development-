import { z } from "zod";

/**
 * Variáveis acessíveis apenas no servidor
 */
export const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.preprocess(
    (val) => process.env.VERCEL_URL ?? val,
    process.env.VERCEL ? z.string() : z.string().url(),
  ),

  // OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  FACEBOOK_CLIENT_ID: z.string(),
  FACEBOOK_CLIENT_SECRET: z.string(),
  LINKEDIN_CLIENT_ID: z.string(),
  LINKEDIN_CLIENT_SECRET: z.string(),

  // Pagamentos
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1), 
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1),
  PAGOFACIL_API_KEY: z.string().min(1),
  RAPIPAGO_API_KEY: z.string().min(1),
});

/**
 * Variáveis que você quer expor ao cliente
 * (Devem sempre começar com NEXT_PUBLIC_)
 */
export const clientSchema = z.object({
  // NEXT_PUBLIC_API_BASE: z.string().url(),
});

/**
 * Exporte os valores validados como objetos JS normais
 */
export const clientEnv = clientSchema.parse({
  // NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
});
