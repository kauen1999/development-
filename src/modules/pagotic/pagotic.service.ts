// src/moduls/pagotic/pagotic.service.ts
import { getPagoticToken } from "./pagotic.auth";
import { PAGOTIC_ENDPOINTS } from "./pagotic.endpoints";
import { toPagoticError } from "./pagotic.errors";
import { buildFiltersQuery, buildSortsQuery, parseJSON, withTimeout } from "./pagotic.utils";
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

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function isPublicHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    const isHttp = u.protocol === "http:" || u.protocol === "https:";
    const isLocalhost =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".local");
    return isHttp && !isLocalhost;
  } catch {
    return false;
  }
}

// ✅ normaliza URL de input (ignora "", localhost e inválidas)
function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

export class PagoticService {
  constructor(private readonly env: EnvLike = process.env) {}

  private baseUrl(): string {
    const b = this.env.PAGOTIC_BASE_URL?.replace(/\/+$/, "");
    return b || "https://api.paypertic.com";
  }

  private timeoutMs(): number {
    const raw = this.env.PAGOTIC_TIMEOUT_MS;
    return raw ? Number(raw) : 15000;
  }

  private envUrl(
    key: "PAGOTIC_RETURN_URL" | "PAGOTIC_BACK_URL" | "PAGOTIC_NOTIFICATION_URL"
  ): string | undefined {
    const v = this.env[key];
    return isPublicHttpUrl(v) ? v : undefined;
  }

  // ✅ fallback seguro baseado no domínio público da app
  private publicBase(): string | undefined {
    const base = this.env.NEXT_PUBLIC_APP_URL;
    if (!isPublicHttpUrl(base)) return undefined;
    return base.replace(/\/+$/, "");
  }

  private defaultReturnUrl(): string | undefined {
    const b = this.publicBase();
    return b ? `${b}/api/webhooks/pagotic-return` : undefined;
  }
  private defaultBackUrl(): string | undefined {
    const b = this.publicBase();
    return b ? `${b}/payment/cancel` : undefined;
  }
  private defaultNotificationUrl(): string | undefined {
    const b = this.publicBase();
    return b ? `${b}/api/webhooks/pagotic` : undefined;
  }

  // Garante compatibilidade com o tipo ProcessEnv do Next
  private authEnv(): NodeJS.ProcessEnv {
    return { ...process.env, ...this.env } as NodeJS.ProcessEnv;
  }

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getPagoticToken(this.authEnv());
    const signal = withTimeout(this.timeoutMs());
    const rsp = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      signal,
    });
    return rsp;
  }

  // --- Core operations ---

  async createPayment(input: CreatePagoticPayment): Promise<PagoticPaymentResponse> {
    // ✅ usa URL do input apenas se for pública e válida; senão cai para .env; senão cai para fallback pelo NEXT_PUBLIC_APP_URL
    const return_url =
      normalizeInputUrl(input.return_url) ??
      this.envUrl("PAGOTIC_RETURN_URL") ??
      this.defaultReturnUrl();

    const back_url =
      normalizeInputUrl(input.back_url) ??
      this.envUrl("PAGOTIC_BACK_URL") ??
      this.defaultBackUrl();

    const notification_url =
      normalizeInputUrl(input.notification_url) ??
      this.envUrl("PAGOTIC_NOTIFICATION_URL") ??
      this.defaultNotificationUrl();

    // ⚠️ não quebra fluxo: se ainda assim ficar sem notification_url, loga e segue (mas você verá o alerta nos logs)
    if (!notification_url) {
      console.error(
        "[PagoTIC] notification_url ausente (input/env/fallback inválidos). O webhook NÃO será disparado."
      );
    }

    const body: CreatePagoticPayment = stripUndefined({
      ...input,
      collector_id: input.collector_id ?? this.env.PAGOTIC_COLLECTOR_ID,
      currency_id: input.currency_id ?? (this.env.PAGOTIC_CURRENCY_ID || "ARS"),
      return_url,
      back_url,
      notification_url,
    });

    // 🔎 log diagnóstico sem dados sensíveis
    try {
      console.log("[PagoTIC][createPayment] urls", {
        external_transaction_id: body.external_transaction_id,
        notification_url: body.notification_url,
        return_url: body.return_url,
        back_url: body.back_url,
        collector_id: body.collector_id,
        currency_id: body.currency_id,
      });
    } catch {}

    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagos, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<PagoticPaymentResponse>(rsp);
  }

  async getPaymentById(id: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosById(id));
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<PagoticPaymentResponse>(rsp);
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
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<PagoticListResponse<PagoticPaymentResponse>>(rsp);
  }

  async cancelPayment(id: string, status_detail?: string): Promise<PagoticPaymentResponse> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosCancelar(id), {
      method: "POST",
      body: JSON.stringify(status_detail ? { status_detail } : {}),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<PagoticPaymentResponse>(rsp);
  }

  async refundPayment(id: string, body: PagoticRefundRequest = {}): Promise<unknown> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDevolucion(id), {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }

  async groupPayments(req: PagoticGroupRequest): Promise<unknown> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosAgrupar, {
      method: "POST",
      body: JSON.stringify(req.paymentIds),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }

  async ungroupPayments(groupId: string): Promise<unknown> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDesagrupar, {
      method: "POST",
      body: JSON.stringify({ group_id: groupId }),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }

  async distributePayment(req: PagoticDistributionRequest): Promise<unknown> {
    const rsp = await this.authedFetch(PAGOTIC_ENDPOINTS.pagosDistribucion, {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }

  // --- Bulk import (base pública) ---

  async bulkImportCsvStart(formData: FormData): Promise<{ import_id: string }> {
    const token = await getPagoticToken(this.authEnv());
    const rsp = await fetch(`${this.baseUrl()}${PAGOTIC_ENDPOINTS.importacionesPagosCsv}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: withTimeout(this.timeoutMs()),
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<{ import_id: string }>(rsp);
  }

  async bulkImportDetails(importId: string, filters: PagoticListFilter[] = []) {
    const q = buildFiltersQuery(filters);
    const path = `${PAGOTIC_ENDPOINTS.importacionesPagosDetalles(importId)}?${q.toString()}`;
    const rsp = await this.authedFetch(path);
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }

  // --- Notifications ---

  async resendNotification(id: string): Promise<unknown> {
    const rsp = await this.authedFetch(`${PAGOTIC_ENDPOINTS.resendNotification}/${encodeURIComponent(id)}`, {
      method: "POST",
    });
    if (!rsp.ok) throw await toPagoticError(rsp);
    return parseJSON<unknown>(rsp);
  }
}
