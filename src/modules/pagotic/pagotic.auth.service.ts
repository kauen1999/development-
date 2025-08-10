// src/modules/pagotic/pagotic.auth.service.ts

let cachedToken: string | undefined;
let tokenExpiry = 0;

/**
 * Obtém um token de acesso para a API PagoTIC usando client_credentials.
 * Usa cache para evitar gerar token a cada requisição.
 */
export async function getPagoTICToken(): Promise<string> {
  const now = Date.now();

  // Reutiliza o token se ainda estiver válido
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.PAGOTIC_CLIENT_ID;
  const clientSecret = process.env.PAGOTIC_CLIENT_SECRET;
  const authUrl =
    process.env.PAGOTIC_AUTH_URL ||
    "https://a.pagotic.com/auth/realms/entidades/protocol/openid-connect/token";

  if (!clientId || !clientSecret) {
    throw new Error("PAGOTIC_CLIENT_ID e PAGOTIC_CLIENT_SECRET são obrigatórios no .env");
  }

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao gerar token PagoTIC: ${res.status} ${await res.text()}`);
  }

  const data: { access_token?: string; expires_in?: number } = await res.json();

  if (!data.access_token) {
    throw new Error("Token PagoTIC não retornado na resposta");
  }

  // Define tempo de expiração
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in ? data.expires_in * 1000 : 300000);

  console.log("[PagoTIC] Novo token gerado e armazenado em cache");

  return cachedToken;
}
