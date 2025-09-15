// src/moduls/pagotic/pagotic.utils.ts
import type { PagoticListFilter, PagoticSorts } from "./pagotic.types";

/** Monta a query de filtros no formato esperado pela API */
export function buildFiltersQuery(filters: PagoticListFilter[]): URLSearchParams {
  const params = new URLSearchParams();
  filters.forEach((f, idx) => {
    params.append(`filters[${idx}][field]`, f.field);
    params.append(`filters[${idx}][operation]`, f.operation);
    params.append(`filters[${idx}][value]`, String(f.value));
  });
  return params;
}

/** Monta a query de ordenações no formato esperado pela API */
export function buildSortsQuery(sorts: PagoticSorts): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, dir] of Object.entries(sorts)) {
    params.append(`sorts[${field}]`, dir);
  }
  return params;
}

/** Parse seguro de JSON (erro curto e útil para logs) */
export async function parseJSON<T>(rsp: Response): Promise<T> {
  const text = await rsp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const head = text.slice(0, 512);
    const hint = `Invalid JSON from PagoTIC${rsp.status ? ` (status ${rsp.status})` : ""}: ${head}`;
    throw new Error(hint);
  }
}

/** Aborta um fetch após ms (compatível com edge/node) */
export function withTimeout(ms: number): AbortSignal | undefined {
  if (!ms || ms <= 0) return undefined;
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
}

/** Remove dados sensíveis de logs (PAN/CVV) */
export function sanitizeForLog(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => {
      if (typeof v === "string" && /(\b\d{12,19}\b)|\bCVV\b/i.test(v)) return "***";
      return v;
    })
  );
}

/**
 * Converte todos os `null` do objeto em `undefined` (recursivo),
 * útil para cumprir regras de lint que proíbem `null`.
 */
export function nullsToUndefined<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj),
    (_k, v) => (v === null ? undefined : v)
  ) as T;
}

/** URL http(s) pública e não-localhost */
export function isPublicHttpUrl(value?: string): value is string {
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

/** Normaliza URL de input; strings vazias/localhost/invalidas viram undefined */
export function normalizeInputUrl(v?: string): string | undefined {
  return isPublicHttpUrl(v) ? v : undefined;
}

/** Status normalizado vindo do PagoTIC */
export type NormalizedStatus = "PAID" | "PENDING" | "CANCELLED";

/** 
 * Converte o status cru do PagoTIC para um valor normalizado.
 * Mantém coerência entre webhook (proxy) e return.
 */
export function normalizePagoticStatus(statusRaw: string | undefined): NormalizedStatus {
  const s = (statusRaw ?? "").trim().toLowerCase();

  const approved = new Set(["approved", "accredited", "paid", "aprobado", "pagado", "success"]);
  const cancelled = new Set(["rejected", "cancelled", "canceled", "failed"]);

  if (approved.has(s)) return "PAID";
  if (cancelled.has(s)) return "CANCELLED";
  return "PENDING";
}
