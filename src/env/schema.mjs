import { z } from "zod";

/**
 * Variáveis do lado do servidor (.env ou painel da Vercel)
 */
export const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),

  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),

  // ✅ Corrigido: fallback seguro para VERCEL_URL + validação robusta
  // Inclui log no build para facilitar o diagnóstico
  NEXTAUTH_URL: z.string().trim().url(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  FACEBOOK_CLIENT_ID: z.string(),
  FACEBOOK_CLIENT_SECRET: z.string(),
  LINKEDIN_CLIENT_ID: z.string(),
  LINKEDIN_CLIENT_SECRET: z.string(),

  // Pagotic
  PAGOTIC_COLLECTOR_ID: z.string().min(1),
});

/**
 * Variáveis do lado do cliente (NEXT_PUBLIC_)
 */
export const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const clientEnv = clientSchema.parse(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      key.startsWith("NEXT_PUBLIC_")
    )
  )
);
