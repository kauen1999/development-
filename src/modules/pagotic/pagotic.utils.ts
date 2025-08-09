// src/modules/pagotic/pagotic.utils.ts
const DEFAULT_OFFSET: string = process.env.PAGOTIC_TZ_OFFSET ?? "-0300";

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

/** yyyy-MM-dd'T'HH:mm:ssZ (sem milissegundos; Z sem “:”) */
export function formatPagoTICDate(date: Date, offset: string = DEFAULT_OFFSET): string {
  const m = offset.match(/^([+-])(\d{2})(\d{2})$/);

  // ✅ checagem explícita de cada grupo p/ satisfazer o TS sem non-null assertion
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    throw new Error(`Offset inválido: ${offset}`);
  }

  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number.parseInt(m[2], 10);
  const mm = Number.parseInt(m[3], 10);
  const totalMinutes = sign * (hh * 60 + mm);

  // “desloca” UTC para o offset desejado (formato exigido pela doc do PagoTIC)
  const local = new Date(date.getTime() + totalMinutes * 60 * 1000);

  const y = local.getUTCFullYear();
  const mon = pad(local.getUTCMonth() + 1);
  const d = pad(local.getUTCDate());
  const h = pad(local.getUTCHours());
  const min = pad(local.getUTCMinutes());
  const s = pad(local.getUTCSeconds());

  return `${y}-${mon}-${d}T${h}:${min}:${s}${offset}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function generateExternalTransactionId(orderId: string): string {
  return `order-${orderId}-${Date.now()}`;
}
