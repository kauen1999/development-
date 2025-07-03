// src/env/index.ts
import { serverSchema, clientSchema } from "./schema.mjs";

const _server = serverSchema.parse(process.env);
const _client = clientSchema.parse({});

export const env = {
  server: _server,
  client: _client,
};
