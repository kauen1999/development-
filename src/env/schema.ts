// src/env/schema.ts
import { z } from "zod";

// Small helper: validates Postgres URL and requires sslmode=require
const postgresUrlWithSsl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine((raw) => {
    try {
      const u = new URL(raw);
      // Accept both postgres:// and postgresql://
      const isPg = u.protocol === "postgres:" || u.protocol === "postgresql:";
      const ssl = u.searchParams.get("sslmode")?.toLowerCase() === "require";
      return isPg && ssl;
    } catch {
      return false;
    }
  }, "DATABASE_URL must be a valid Postgres URL and include sslmode=require");

// Compute a safe default for NEXTAUTH_URL without workarounds/hacks
const computeDefaultNextAuthUrl = () => {
  // In development, default to localhost
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  // On Vercel, VERCEL_URL is set without protocol (e.g. my-app.vercel.app)
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    undefined;
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

/** Server-side (Node.js only) environment */
export const serverSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default((process.env.NODE_ENV as "development" | "test" | "production") ?? "development"),

    DATABASE_URL: postgresUrlWithSsl,

    // Kept for compatibility; Prisma + Supabase should use ssl required in serverless.
    PGSSLMODE: z.enum(["disable", "allow", "prefer", "require"]).default("require"),

    // Required only in production (enforced in superRefine below)
    NEXTAUTH_SECRET: z.string().min(1).optional(),

    // Robust default:
    // - dev: http://localhost:3000
    // - prod: from NEXT_PUBLIC_APP_URL or VERCEL_URL
    NEXTAUTH_URL: z.preprocess(
      (val) => (typeof val === "string" && val.length > 0 ? val : computeDefaultNextAuthUrl()),
      z.string().url("NEXTAUTH_URL must be a valid URL"),
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

    // ► Supabase (server-side). Optional here; require only if you actually use server uploads.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    // Enforce NEXTAUTH_SECRET in production only
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
