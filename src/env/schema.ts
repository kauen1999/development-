// src/env/schema.ts
import { z } from "zod";

// Helpers
const clean = (v?: string | null) =>
  (v ?? "").replace(/^["']|["']$/g, "").trim();

function normalizeUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(url);
    return u.origin;
  } catch {
    return undefined;
  }
}

const postgresUrlWithSsl = z.string().min(1).refine((raw) => {
  try {
    const u = new URL(raw);
    const isPg = u.protocol === "postgres:" || u.protocol === "postgresql:";
    const ssl = u.searchParams.get("sslmode")?.toLowerCase() === "require";
    return isPg && ssl;
  } catch {
    return false;
  }
}, "DATABASE_URL must be a valid Postgres URL and include sslmode=require");

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

const computeDefaultNextAuthUrl = () => {
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || undefined;
  return normalizeUrl(raw);
};

// Server
export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"])
    .default((process.env.NODE_ENV as "development" | "test" | "production") ?? "development"),

  DATABASE_URL: postgresUrlWithSsl,
  PGSSLMODE: z.enum(["disable", "allow", "prefer", "require"]).default("require"),

  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required in production").optional(),

  NEXTAUTH_URL: z.preprocess(
    (val) => (typeof val === "string" && val.length > 0 ? normalizeUrl(val) : computeDefaultNextAuthUrl()),
    z.string().url().refine((url) => normalizeUrl(url) !== undefined, "NEXTAUTH_URL must be normalized")
  ),

  // PagoTIC base URLs (aceitamos os dois nomes)
  PAGOTIC_BASE_URL: z.string().url().optional(),
  PAGOTIC_API_URL: z.string().url().optional(), // shim

  PAGOTIC_AUTH_URL: z.string().url(),

  // Credenciais
  PAGOTIC_CLIENT_ID: z.preprocess(
    (v) => clean(v as string),
    z.string().refine((s) => s.length === 36 && isUuid(s), "PAGOTIC_CLIENT_ID deve ser UUID com 36 chars")
  ),
  PAGOTIC_CLIENT_SECRET: z.preprocess((v) => clean(v as string), z.string().min(1)),
  PAGOTIC_USERNAME: z.preprocess((v) => clean(v as string), z.string().min(1)),
  PAGOTIC_PASSWORD: z.preprocess((v) => clean(v as string), z.string().min(1)),

  // URLs de retorno (públicas). Opcional no env — service completa com env se input não trouxer.
  PAGOTIC_RETURN_URL: z.string().url().optional(),
  PAGOTIC_BACK_URL: z.string().url().optional(),
  PAGOTIC_NOTIFICATION_URL: z.string().url().optional(),

  // Moeda (aceita “CURRENCY” ou “CURRENCY_ID”)
  PAGOTIC_CURRENCY: z.enum(["ARS", "USD"]).default("ARS").optional(),
  PAGOTIC_CURRENCY_ID: z.enum(["ARS", "USD"]).default("ARS").optional(), // shim

  // Collector
  PAGOTIC_COLLECTOR_ID: z.string().min(1).optional(),

  // Supabase (opcional aqui)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
}).transform((env) => {
  // Shims
  const baseUrl = env.PAGOTIC_BASE_URL ?? env.PAGOTIC_API_URL ?? "https://api.paypertic.com";
  const currency = env.PAGOTIC_CURRENCY ?? env.PAGOTIC_CURRENCY_ID ?? "ARS";
  return { ...env, PAGOTIC_BASE_URL: baseUrl, PAGOTIC_CURRENCY: currency as "ARS" | "USD" };
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && !env.NEXTAUTH_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["NEXTAUTH_SECRET"], message: "NEXTAUTH_SECRET is required in production" });
  }
});

// Client
export const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
