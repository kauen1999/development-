// src/env/index.ts
import { serverSchema, clientSchema } from "./schema.js";

const _server = serverSchema.parse(process.env);

const _client = clientSchema.parse(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("NEXT_PUBLIC_"))
  )
);

export const env = {
  server: _server,
  client: _client,
};

