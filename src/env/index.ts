// src/env/index.ts
import { serverSchema, clientSchema, type ServerEnv, type ClientEnv } from "./schema";

export const env: { server: ServerEnv; client: ClientEnv } = {
  server: serverSchema.parse(process.env),
  client: clientSchema.parse(
    Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("NEXT_PUBLIC_")))
  ),
} as const;

if (process.env.NODE_ENV !== "production") {
  const cid = env.server.PAGOTIC_CLIENT_ID;
  // logs de debug não vazam segredo nenhum
  // eslint-disable-next-line no-console
  console.log("[ENV][PAGOTIC_CLIENT_ID] len:", cid.length);
  console.log("[ENV][PAGOTIC_CLIENT_ID] preview:", `${cid.slice(0, 8)}…${cid.slice(-8)}`);
}
