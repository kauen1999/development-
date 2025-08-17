import {
  parseEnv,
  parseCreatePaymentPayload,
  parseTokenResponse,
  parseGetPaymentResponse,
  type CreatePaymentPayload,
  type GetPaymentResponse,
  type PagoticEnv,
} from "./pagotic.schema";

/** Interface de logger esperada pelo service (sem `any`) */
export type LoggerLike = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

type ServiceOpts = {
  logger?: LoggerLike;
  timeoutMs?: number; // timeout por request
  retries?: number;   // tentativas em 5xx/timeout
};

type FetchJSONOptions = {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
};

/** Erros padronizados */
export class PagoticError extends Error {
  code: "REQUEST_ABORTED" | "HTTP_ERROR" | "TOKEN_ERROR" | "PARSE_ERROR";
  status?: number;
  constructor(code: PagoticError["code"], message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** fetch com AbortController, timeout e parse JSON seguro */
async function fetchJSON<T>(opts: FetchJSONOptions): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(opts.url, {
      method: opts.method,
      headers: {
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers ?? {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text(); // preserva p/ log mesmo se JSON inválido
    if (!res.ok) {
      throw new PagoticError(
        "HTTP_ERROR",
        `HTTP ${res.status} ${res.statusText} for ${opts.url}: ${text.slice(0, 500)}`,
        res.status
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new PagoticError("PARSE_ERROR", `Invalid JSON from ${opts.url}: ${text.slice(0, 500)}`);
    }
  } catch (err) {
    const e = err as Error;
    // Node 18+ expõe AbortError com name="AbortError"
    if (e.name === "AbortError") {
      throw new PagoticError("REQUEST_ABORTED", `Timeout after ${opts.timeoutMs}ms for ${opts.url}`);
    }
    if (err instanceof PagoticError) throw err;
    throw new PagoticError("HTTP_ERROR", e.message);
  } finally {
    clearTimeout(t);
  }
}

export class PagoticService {
  private env: PagoticEnv;
  private logger: LoggerLike;
  private timeoutMs: number;
  private retries: number;

  constructor(envLike: unknown, opts?: ServiceOpts) {
    this.env = parseEnv(envLike);
    this.logger = opts?.logger ?? console;
    this.timeoutMs = Math.max(5000, opts?.timeoutMs ?? 30000); // 30s default
    this.retries = Math.min(3, Math.max(0, opts?.retries ?? 1)); // 1 retry default

    // Guard contra host incorreto (apenas aviso; não altera comportamento)
    try {
      const u = new URL(this.env.PAGOTIC_API_URL);
      const host = u.hostname.toLowerCase();
      if (host.includes("pagotic.com")) {
        this.logger.warn(
          `[PagoTIC] Possível host incorreto (${host}). Use api.paypertic.com ou api-sandbox.paypertic.com.`
        );
      }
    } catch {
      // parse já garantido pelo schema; apenas defensivo
    }
  }

  /* ------------------------ OAuth2 ------------------------ */
  private async getAccessToken(): Promise<string> {
    const {
      PAGOTIC_AUTH_URL,
      PAGOTIC_CLIENT_ID,
      PAGOTIC_CLIENT_SECRET,
      PAGOTIC_USERNAME,
      PAGOTIC_PASSWORD,
    } = this.env;

    this.logger.debug("[PagoTIC] Fetching token…");
    const form = new URLSearchParams({
      grant_type: "password",
      client_id: PAGOTIC_CLIENT_ID,
      client_secret: PAGOTIC_CLIENT_SECRET,
      username: PAGOTIC_USERNAME,
      password: PAGOTIC_PASSWORD,
    });

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(PAGOTIC_AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new PagoticError("TOKEN_ERROR", `Token HTTP ${res.status}: ${text.slice(0, 500)}`, res.status);
      }
      const json = parseTokenResponse(JSON.parse(text));
      this.logger.debug("[PagoTIC] Token OK (expires_in=", json.expires_in, ")");
      return json.access_token;
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        throw new PagoticError("REQUEST_ABORTED", `Token timeout after ${this.timeoutMs}ms`);
      }
      if (err instanceof PagoticError) throw err;
      throw new PagoticError("TOKEN_ERROR", e.message);
    } finally {
      clearTimeout(t);
    }
  }

  /* ------------------------ Criar pagamento ------------------------ */
  async createPayment(
    payloadLike: unknown,
    opts?: { fillDefaultCurrency?: boolean; fillDefaultConcept?: boolean; enforceEnvUrls?: boolean }
  ): Promise<GetPaymentResponse> {
    // 1) Normaliza payload de entrada
    const payload = parseCreatePaymentPayload(payloadLike);

    // 2) Preenche defaults (currency/concept por item; URLs do env)
    const details = payload.details.map((d) => ({
      ...d,
      currency_id: d.currency_id ?? this.env.PAGOTIC_CURRENCY_ID,
      concept_id: d.concept_id ?? this.env.PAGOTIC_CONCEPT_ID_DEFAULT,
    }));

    const effectivePayload: CreatePaymentPayload = {
      ...payload,
      details,
      ...(opts?.enforceEnvUrls
        ? {
            return_url: this.env.PAGOTIC_RETURN_URL,
            back_url: this.env.PAGOTIC_BACK_URL,
            notification_url: this.env.PAGOTIC_NOTIFICATION_URL,
          }
        : {}),
      // Só envia collector_id se existir (collector opcional)
      ...(this.env.PAGOTIC_COLLECTOR_ID ? { collector_id: this.env.PAGOTIC_COLLECTOR_ID } : {}),
    };

    if (!this.env.PAGOTIC_COLLECTOR_ID) {
      this.logger.info("[PagoTIC] PAGOTIC_COLLECTOR_ID ausente — usando contexto do token OAuth");
    }

    // 3) Token
    const token = await this.getAccessToken();

    // 4) POST /pagos com retry mínimo
    const url = `${this.env.PAGOTIC_API_URL.replace(/\/+$/, "")}/pagos`;

    let lastErr: PagoticError | undefined;
    const attempts = this.retries + 1;
    for (let i = 0; i < attempts; i++) {
      try {
        this.logger.debug(`[PagoTIC] POST ${url} (attempt ${i + 1}/${attempts})`);
        const json = await fetchJSON<unknown>({
          method: "POST",
          url,
          headers: { Authorization: `Bearer ${token}` },
          body: effectivePayload,
          timeoutMs: this.timeoutMs, // 30s default (pode ser maior no router)
        });
        const parsed = parseGetPaymentResponse(json);
        return parsed;
      } catch (err) {
        const e = err as PagoticError;
        lastErr = e;
        this.logger.warn(
          `[PagoTIC] createPayment error (${e.code}${e.status ? ` ${e.status}` : ""}): ${e.message}`
        );
        // Retry apenas em timeout/5xx
        if (e.code === "REQUEST_ABORTED" || (e.code === "HTTP_ERROR" && e.status && e.status >= 500)) {
          if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
            continue;
          }
        }
        break;
      }
    }
    throw lastErr ?? new PagoticError("HTTP_ERROR", "Unknown error on createPayment");
  }

  /* ------------------------ GET /pagos/:id ------------------------ */
  async getPaymentById(id: string): Promise<GetPaymentResponse> {
    const token = await this.getAccessToken();
    const url = `${this.env.PAGOTIC_API_URL.replace(/\/+$/, "")}/pagos/${encodeURIComponent(id)}`;
    const json = await fetchJSON<unknown>({
      method: "GET",
      url,
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: this.timeoutMs,
    });
    return parseGetPaymentResponse(json);
  }
}
