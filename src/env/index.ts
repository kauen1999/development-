import { serverEnv, clientEnv } from "./schema";

export const env = {
  server: serverEnv,
  client: clientEnv,
} as const;

// Debug: mostrar infos do client_id em dev
if (process.env.NODE_ENV !== "production") {
  const cid = env.server.PAGOTIC_CLIENT_ID;
  console.log("[ENV][PAGOTIC_CLIENT_ID] len:", cid.length);
  console.log(
    "[ENV][PAGOTIC_CLIENT_ID] preview:",
    cid.slice(0, 8) + "…" + cid.slice(-8),
  );
  console.log(
    "[ENV][PAGOTIC_CLIENT_ID] lastCodes:",
    Array.from(cid)
      .slice(-12)
      .map((ch) => ch.charCodeAt(0))
      .join(","),
  );
}
