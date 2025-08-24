// src/moduls/pagotic/pagotic.auth.ts
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope?: string;
};

let cached: { token: string; exp: number } | null = null;

const now = () => Math.floor(Date.now() / 1000);

const clean = (v?: string | null) => (v ?? "").replace(/^["']|["']$/g, "").trim();
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

function assertPagoticEnv(env: NodeJS.ProcessEnv) {
  const client_id = clean(env.PAGOTIC_CLIENT_ID);
  const client_secret = clean(env.PAGOTIC_CLIENT_SECRET);
  const username = clean(env.PAGOTIC_USERNAME);
  const password = clean(env.PAGOTIC_PASSWORD);

  if (client_id.length !== 36 || !isUuid(client_id)) {
    throw new Error("PAGOTIC_CLIENT_ID inválido: esperado UUID com 36 chars.");
  }
  if (!client_secret) throw new Error("PAGOTIC_CLIENT_SECRET ausente.");
  if (!username) throw new Error("PAGOTIC_USERNAME ausente.");
  if (!password) throw new Error("PAGOTIC_PASSWORD ausente.");

  return { client_id, client_secret, username, password };
}

export async function getPagoticToken(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (cached && cached.exp - now() > 30) return cached.token;

  const tokenUrl =
    (env.PAGOTIC_AUTH_URL?.trim() || "") || `https://a.paypertic.com${PAGOTIC_ENDPOINTS.authToken}`;

  const { client_id, client_secret, username, password } = assertPagoticEnv(env);

  const body = new URLSearchParams({
    grant_type: "password",
    client_id,
    client_secret,
    username,
    password,
  });

  const rsp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!rsp.ok) {
    const txt = await rsp.text().catch(() => "");
    throw new Error(`Pagotic auth failed (${rsp.status}): ${txt}`);
  }

  const json = (await rsp.json()) as TokenResponse;
  cached = { token: json.access_token, exp: now() + json.expires_in };
  return json.access_token;
}
