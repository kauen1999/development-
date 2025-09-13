import { getPagoticToken } from "./pagotic.auth";
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";
import { toPagoticError } from "./pagotic.errors";
import {
  buildFiltersQuery,
  buildSortsQuery,
  parseJSON,
  withTimeout,
} from "./pagotic.utils";
import type {
  CreatePagoticPayment,
  PagoticGroupRequest,
  PagoticListFilter,
  PagoticListResponse,
  PagoticPaymentResponse,
  PagoticRefundRequest,
  PagoticDistributionRequest,
} from "./pagotic.types";

type EnvLike = Partial<Record<string, string | undefined>>;

/** URL http(s) pública e não-localhost */
function isPublicHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    const isHttp = u.protocol === "http:" || u.protocol === "https:";
    const isLocal =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".local");
    return isHttp && !isLocal;
  } catch {
    return false;
  }
}

/** Normaliza URL de input; vazia/localhost → undefined */
function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

export class PagoticService {
  constructor(private readonly env: EnvLike = process.env) {}

  private baseUrl(): string {
    const raw =
      (this.env.PAGOTIC_BASE_URL ||
        this.env.PAGOTIC_API_URL ||
        "https://api.paypertic.com") as string;
    return raw.replace(/\/+$/, "");
  }

  private timeoutMs(): number {
    const raw = this.env.PAGOTIC_TIMEOUT_MS;
    return raw ? Number(raw) : 15_000;
  }

  private envUrl(
    k: "PAGOTIC_RETURN_URL" | "PAGOTIC_BACK_URL" | "PAGOTIC_NOTIFICATION_URL",
  ): string | undefined {
    const v = this.env[k];
    return isPublicHttpUrl(v) ? v : undefined;
  }

  private currency(): string {
    return this.env.PAGOTIC_CURRENCY || this.env.PAGOTIC_CURRENCY_ID || "ARS";
  }

  private authEnv(): NodeJS.ProcessEnv {
    return { ...process.env, ...this.env } as NodeJS.ProcessEnv;
  }

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getPagoticToken(this.authEnv());
    const signal = withTimeout(this.timeoutMs());
    return fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      signal,
    });
  }

  // --- Core operations ---

  async createPayment(input: CreatePagoticPayment): Promise<PagoticPaymentResponse> {
    const return_url =
      normalizeInputUrl(input.return_url) ?? this.envUrl("PAGOTIC_RETURN_URL");
    const back_url =
      normalizeInputUrl(input.back_url) ?? this.envUrl("PAGOTIC_BACK_URL");
    const notification_url =
      normalizeInputUrl(input.notification_url) ??
      this.envUrl("PAGOTIC_NOTIFICATION_URL");

    if (!notification_url) {
      throw new Error(
        "notification_url ausente. Configure PAGOTIC_NOTIFICATION_URL no ambiente ou envie uma URL pública válida."
      );
    }

    const body: CreatePagoticPayment = {
      ...input,
      collector_id: input.collector_id ?? this.env.PAGOTIC_COLLECTOR_ID,
      currency_id: input.currency_id ?? this.currency(),
      return_url,
      back_url,
      notification_url,
    };

   

    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagos, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const json = await parseJSON<PagoticPaymentResponse>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async getPaymentById(id: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosById(id));
    const json = await parseJSON<PagoticPaymentResponse>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async listPayments(params: {
    page?: number;
    limit?: number;
    filters: PagoticListFilter[];
    sorts?: Record<string, "ascending" | "descending">;
  }): Promise<PagoticListResponse<PagoticPaymentResponse>> {
    const { page = 1, limit = 10, filters, sorts = {} } = params;
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    buildFiltersQuery(filters).forEach((v, k) => q.append(k, v));
    buildSortsQuery(sorts).forEach((v, k) => q.append(k, v));

    const rsp = await this.authedFetch(`${PAGOTIC_ENDPOINTS.pagos}?${q.toString()}`);
    const json = await parseJSON<PagoticListResponse<PagoticPaymentResponse>>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async cancelPayment(id: string, status_detail?: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosCancelar(id), {
      method: "POST",
      body: JSON.stringify(status_detail ? { status_detail } : {}),
    });
    const json = await parseJSON<PagoticPaymentResponse>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async refundPayment(
    id: string,
    body: PagoticRefundRequest = {},
  ): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDevolucion(id), {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await parseJSON<Record<string, unknown>>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async groupPayments(req: PagoticGroupRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosAgrupar, {
      method: "POST",
      body: JSON.stringify(req.paymentIds),
    });
    const json = await parseJSON<Record<string, unknown>>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async ungroupPayments(groupId: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDesagrupar, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
    const json = await parseJSON<Record<string, unknown>>(rsp);
    

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async distributePayment(req: PagoticDistributionRequest): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDistribucion, {
      method: "POST",
      body: JSON.stringify(req),
    });
    const json = await parseJSON<Record<string, unknown>>(rsp);

    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }

  async resendNotification(id: string): Promise<Record<string, unknown>> {
    const rsp = await this.authedFetch(
      `${PAGOTIC_ENDPOINTS.resendNotification}/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    const json = await parseJSON<Record<string, unknown>>(rsp);
    
    if (!rsp.ok) throw await toPagoticError(rsp);
    return json;
  }
}
