import type { PagoticListFilter, PagoticSorts } from "./pagotic.types";

export function buildFiltersQuery(filters: PagoticListFilter[]): URLSearchParams {
  // API expects filters[n][field], filters[n][operation], filters[n][value]
  const params = new URLSearchParams();
  filters.forEach((f, idx) => {
    params.append(`filters[${idx}][field]`, f.field);
    params.append(`filters[${idx}][operation]`, f.operation);
    params.append(`filters[${idx}][value]`, String(f.value));
  });
  return params;
}

export function buildSortsQuery(sorts: PagoticSorts): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, dir] of Object.entries(sorts)) {
    params.append(`sorts[${field}]`, dir);
  }
  return params;
}

export async function parseJSON<T>(rsp: Response): Promise<T> {
  const text = await rsp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from PagoTIC: ${text.slice(0, 512)}`);
  }
}

export function withTimeout(ms: number): AbortSignal | undefined {
  if (!ms || ms <= 0) return undefined;
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
}

export function sanitizeForLog(obj: unknown): unknown {
  // Remove potential PAN/security fields if present
  if (!obj || typeof obj !== "object") return obj;
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => {
      if (typeof v === "string" && /(\b\d{12,19}\b)|\bCVV\b/i.test(v)) return "***";
      return v;
    }),
  );
}
