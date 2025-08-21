// src/modules/payment/pagotic.auth.ts
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope?: string;
};

let cached: { token: string; exp: number } | null = null;

const now = () => Math.floor(Date.now() / 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────
const clean = (v?: string | null) =>
  (v ?? "").replace(/^["']|["']$/g, "").trim(); // remove aspas de borda e espaços

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

const tailCodes = (s: string, n = 12) =>
  Array.from(s).slice(-n).map((ch) => ch.charCodeAt(0)).join(",");

function assertPagoticEnv(env: NodeJS.ProcessEnv) {
  // NUNCA trime o client_id/secret além de remover aspas e espaços de borda
  const clientId = clean(env.PAGOTIC_CLIENT_ID);
  const clientSecret = clean(env.PAGOTIC_CLIENT_SECRET);
  const username = clean(env.PAGOTIC_USERNAME);
  const password = clean(env.PAGOTIC_PASSWORD);

  // Logs de diagnóstico (sem vazar segredo):
  console.log("[PagoTIC][Auth] clientId.len:", clientId.length);
  console.log(
    "[PagoTIC][Auth] clientId.preview:",
    clientId.slice(0, 8) + "…" + clientId.slice(-8)
  );
  console.log(
    "[PagoTIC][Auth] clientId.tail.codes:",
    tailCodes(clientId)
  );

  // Validações fortes:
  if (clientId.length !== 36 || !isUuid(clientId)) {
    throw new Error(
      `PAGOTIC_CLIENT_ID inválido: esperado UUID com 36 chars. Recebido len=${clientId.length}.`
    );
  }
  if (!clientSecret) throw new Error("PAGOTIC_CLIENT_SECRET ausente.");
  if (!username) throw new Error("PAGOTIC_USERNAME ausente.");
  if (!password) throw new Error("PAGOTIC_PASSWORD ausente.");

  return { clientId, clientSecret, username, password };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function getPagoticToken(env = process.env): Promise<string> {
  // cache simples
  if (cached && cached.exp - now() > 30) return cached.token;

  const tokenUrl =
    env.PAGOTIC_AUTH_URL?.trim() ||
    `https://a.paypertic.com${PAGOTIC_ENDPOINTS.authToken}`;

  // Normaliza + valida credenciais (não altera conteúdo, só remove aspas/esp.)
  const { clientId, clientSecret, username, password } = assertPagoticEnv(env);

  console.log("[PagoTIC][Auth] Using password grant at:", tokenUrl);

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
  });

  // Não vazar senha:
  console.log(
    "[PagoTIC][Auth] body preview:",
    body.toString().replace(/password=[^&]+/, "password=***")
  );

  const rsp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!rsp.ok) {
    const text = await safeText(rsp);
    console.error("[PagoTIC][Auth] FAILED", rsp.status, text);
    throw new Error(`Pagotic auth failed (${rsp.status}): ${text}`);
  }

  const json = (await rsp.json()) as TokenResponse;
  cached = { token: json.access_token, exp: now() + json.expires_in };
  console.log(
    "[PagoTIC][Auth] SUCCESS: token received, expires in",
    json.expires_in,
    "s"
  );
  return json.access_token;
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
