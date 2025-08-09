// src/env/schema.ts
import { z } from "zod";

/** Variáveis do servidor (Node.js) */
export const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.includes("sslmode=require"), {
      message: "DATABASE_URL must include sslmode=require",
    }),
  PGSSLMODE: z.enum(["disable", "allow", "prefer", "require"]).default("require"),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().trim().url(),

  // ► PagoTIC
  PAGOTIC_BASE_URL: z.string().url(),
  PAGOTIC_CLIENT_ID: z.string().min(1),
  PAGOTIC_CLIENT_SECRET: z.string().min(1),
  PAGOTIC_USERNAME: z.string().min(1),
  PAGOTIC_PASSWORD: z.string().min(1),
  PAGOTIC_RETURN_URL: z.string().url().optional(),
  PAGOTIC_BACK_URL: z.string().url().optional(),
  PAGOTIC_NOTIFICATION_URL: z.string().url().optional(),
});

/** Variáveis públicas (expostas no browser) */
export const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/** Exporta os envs já validados */
export const serverEnv = serverSchema.parse(process.env);

export const clientEnv = clientSchema.parse(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("NEXT_PUBLIC_"))
  )
);
