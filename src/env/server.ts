import { z } from "zod";

// … seu clientSchema aqui …

export const serverSchema = z.object({
  // — seus campos já existentes —
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Ex.: banco, auth, etc que você já tem
  DATABASE_URL: z.string().min(1).optional(), // ajuste conforme seu projeto
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),

  // ================================
  // PagoTIC (OBRIGATÓRIOS)
  PAGOTIC_BASE_URL: z.string().url(),
  PAGOTIC_AUTH_URL: z.string().url(),
  PAGOTIC_CLIENT_ID: z.string().min(1),
  PAGOTIC_CLIENT_SECRET: z.string().min(1),
  PAGOTIC_RETURN_URL: z.string().url(),
  PAGOTIC_BACK_URL: z.string().url(),
  PAGOTIC_NOTIFICATION_URL: z.string().url(),

  // PagoTIC (OPCIONAIS com defaults)
  // currency_id do payload (root). Aceitamos apenas ARS | USD; default ARS.
  PAGOTIC_CURRENCY: z.enum(["ARS", "USD"]).default("ARS").optional(),

  // grant type do OAuth: client_credentials (default) ou password
  PAGOTIC_GRANT_TYPE: z
    .enum(["client_credentials", "password"])
    .default("client_credentials")
    .optional(),

  // se usar grant = password
  PAGOTIC_USERNAME: z.string().optional(),
  PAGOTIC_PASSWORD: z.string().optional(),

  // path do endpoint de criação (ex.: "/v1/payments"); permite ausente
  PAGOTIC_CREATE_PATH: z
    .string()
    .regex(
      /^\/[A-Za-z0-9/_-]*$/,
      "PAGOTIC_CREATE_PATH deve iniciar com '/' e conter apenas letras, números, '-', '_' e '/'.",
    )
    .optional(),

  // Debug opcional
  DEBUG_PAGOTIC: z.string().optional(),
});
