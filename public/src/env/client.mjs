// src/env/client.mjs
import { clientEnv, clientSchema } from "./schema.mjs";

const result = clientSchema.safeParse(clientEnv);
if (!result.success) {
  console.error("❌ Invalid public env vars:", result.error.format());
  throw new Error("Invalid public environment variables");
}

// só chaves começando com NEXT_PUBLIC_ devem estar aqui
for (let key of Object.keys(result.data)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.error(`❌ Invalid public env var name: ${key}`);
    throw new Error("Invalid public environment variable name");
  }
}

export const formatErrors = (errors) =>
  Object.entries(errors)
    .map(([k, v]) => (v?._errors ? `${k}: ${v._errors.join(", ")}` : null))
    .filter(Boolean);

export const env = result.data;
