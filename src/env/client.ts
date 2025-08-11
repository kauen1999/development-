// src/env/client.ts
import { clientSchema } from "./schema";

// Extrai apenas variáveis NEXT_PUBLIC_* do process.env
const rawClientEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    key.startsWith("NEXT_PUBLIC_")
  )
);

const clientParse = clientSchema.safeParse(rawClientEnv);
if (!clientParse.success) {
  // usa parsed.error.issues para obter mensagens tipadas
  const msgs = clientParse.error.issues.map(
    (i) => `${i.path.join(".")}: ${i.message}`
  );
  console.error(" Invalid public env vars:", ...msgs);
  throw new Error("Invalid public environment variables");
}

// somente chaves NEXT_PUBLIC_ em clientParse.data (já garantido pelo filtro)
export const env = clientParse.data;
