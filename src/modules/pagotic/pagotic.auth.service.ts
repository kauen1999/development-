// src/modules/pagotic/pagotic.auth.service.ts
let cachedToken: string | undefined;
let tokenExpiry = 0;

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * Gera token OAuth2 client_credentials na PagoTIC.
 * - Usa cache enquanto estiver válido.
 * - Retry com backoff em 5xx/erros de rede.
 */
export async function getPagoTICToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const clientId = process.env.PAGOTIC_CLIENT_ID;
  const clientSecret = process.env.PAGOTIC_CLIENT_SECRET;
  const authUrl =
    process.env.PAGOTIC_AUTH_URL ||
    "https://a.pagotic.com/auth/realms/entidades/protocol/openid-connect/token";

  if (!clientId || !clientSecret) {
    throw new Error("PAGOTIC_CLIENT_ID e PAGOTIC_CLIENT_SECRET são obrigatórios no .env");
  }

  // até 3 tentativas
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000); // 6s por tentativa

      const res = await fetch(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        // Se 4xx, não adianta insistir; se 5xx, podemos tentar de novo
        const body = await res.text();
        const msg = `Falha ao gerar token PagoTIC: ${res.status} ${body}`;
        if (res.status >= 500 && res.status < 600) {
          throw new Error(msg); // cai no catch e re-tenta
        }
        // 4xx → falha final
        throw new Error(msg);
      }

      const data: { access_token?: string; expires_in?: number } = await res.json();
      if (!data.access_token) throw new Error("Token PagoTIC não retornado na resposta");

      cachedToken = data.access_token;
      tokenExpiry = now + (data.expires_in ? data.expires_in * 1000 : 300000);
      console.log("[PagoTIC] Novo token gerado e armazenado em cache");
      return cachedToken;
    } catch (err) {
      lastErr = err;
      console.warn(`[PagoTIC] Token tentativa ${attempt}/${maxAttempts} falhou.`, err);
      // backoff (1s, 4s) antes de tentar de novo
      if (attempt < maxAttempts) await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }

  // Falhou todas as tentativas
  throw (lastErr instanceof Error ? lastErr : new Error("Falha ao gerar token PagoTIC (desconhecida)"));
}
