// src/env/index.ts
import { serverEnv, clientEnv } from "./schema";

export const env = {
  server: serverEnv,
  client: clientEnv,
} as const;
