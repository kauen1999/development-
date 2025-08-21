export class PagoticError extends Error {
  constructor(message: string, public status?: number, public code?: number) {
    super(message);
    this.name = "PagoticError";
  }
}

export async function toPagoticError(rsp: Response): Promise<PagoticError> {
  let payload: unknown;
  try {
    payload = await rsp.json();
  } catch {
    payload = await rsp.text();
  }

  // type guard seguro: verifica se é objeto indexável
  const isObj = (val: unknown): val is Record<string, unknown> =>
    typeof val === "object" && val !== null;

  const msg =
    isObj(payload) && "message" in payload
      ? String(payload.message)
      : String(payload ?? rsp.statusText);

  const ext =
    isObj(payload) && "extended_code" in payload
      ? Number(payload.extended_code)
      : undefined;

  return new PagoticError(msg, rsp.status, ext);
}
