// src/env/schema.ts
import { z } from "zod";

// Small helper: validates Postgres URL and requires sslmode=require
const postgresUrlWithSsl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine((raw) => {
    try {
      const u = new URL(raw);
      const isPg = u.protocol === "postgres:" || u.protocol === "postgresql:";
      const ssl = u.searchParams.get("sslmode")?.toLowerCase() === "require";
      return isPg && ssl;
    } catch {
      return false;
    }
  }, "DATABASE_URL must be a valid Postgres URL and include sslmode=require");

/**
 * Normalize any raw string into a valid origin (protocol + host + optional port)
 * Returns undefined if invalid.
 */
function normalizeUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(url);
    return u.origin; // only protocol + host + port
  } catch {
    return undefined;
  }
}

/**
 * Compute a safe default for NEXTAUTH_URL without workarounds/hacks.
 * - In dev, defaults to http://localhost:3000
 * - In prod, tries NEXT_PUBLIC_APP_URL or VERCEL_URL, normalized
 */
const computeDefaultNextAuthUrl = () => {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || undefined;
  return normalizeUrl(raw);
};

/** Server-side (Node.js only) environment */
export const serverSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default(
        (process.env.NODE_ENV as "development" | "test" | "production") ??
          "development",
      ),

    DATABASE_URL: postgresUrlWithSsl,

    PGSSLMODE: z.enum(["disable", "allow", "prefer", "require"]).default("require"),

    NEXTAUTH_SECRET: z.string().min(1).optional(),

    NEXTAUTH_URL: z.preprocess(
      (val) =>
        typeof val === "string" && val.length > 0
          ? normalizeUrl(val)
          : computeDefaultNextAuthUrl(),
      z
        .string()
        .url("NEXTAUTH_URL must be a valid URL")
        .refine(
          (url) => normalizeUrl(url) !== undefined,
          "NEXTAUTH_URL must be a valid and normalized URL",
        ),
    ),

    // ► PagoTIC
    PAGOTIC_BASE_URL: z.string().url(),
    PAGOTIC_CLIENT_ID: z.string().min(1),
    PAGOTIC_CLIENT_SECRET: z.string().min(1),
    PAGOTIC_USERNAME: z.string().min(1),
    PAGOTIC_PASSWORD: z.string().min(1),
    PAGOTIC_RETURN_URL: z.string().url().optional(),
    PAGOTIC_BACK_URL: z.string().url().optional(),
    PAGOTIC_NOTIFICATION_URL: z.string().url().optional(),
    PAGOTIC_AUTH_URL: z.string().url(),

    // ► Supabase (server-side)
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.NEXTAUTH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXTAUTH_SECRET"],
        message: "NEXTAUTH_SECRET is required in production",
      });
    }
  });

/** Public (browser-exposed) environment */
export const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/** Parsed & validated envs */
export const serverEnv = serverSchema.parse(process.env);

export const clientEnv = clientSchema.parse(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("NEXT_PUBLIC_")),
  ),
);
