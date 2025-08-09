// src/env/server.ts

import { serverSchema } from "./schema";
import { env as clientEnv } from "./client";

// Valida as variáveis de ambiente do servidor
const parsed = serverSchema.safeParse(process.env);
if (!parsed.success) {
  // Usa parsed.error.issues, que é tipado como ZodIssue[]
  const messages = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  console.error("❌ Invalid server env vars:", ...messages);
  throw new Error("Invalid environment variables");
}

// Garante que nenhuma NEXT_PUBLIC_ está definida no lado servidor
for (const key of Object.keys(parsed.data)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.error("❌ Exposing server env var:", key);
    throw new Error("You are exposing a server-side env-variable");
  }
}

// Exporta todas as vars validadas, incluindo as públicas (clientEnv)
export const env = {
  ...parsed.data,
  ...clientEnv,
};
