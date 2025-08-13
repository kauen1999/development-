// src/modules/pagotic/pagotic.service.ts
import axios, { type AxiosError } from "axios";
import { env } from "@/env";
import { createPagoSchema, type CreatePagoPayload } from "./pagotic.schema";
import { getPagoTICToken } from "./pagotic.auth.service";

export type PagoTICResponse = {
  id: string;
  form_url?: string;
  checkout_url?: string;
  external_transaction_id?: string;
  status?: string;
  [k: string]: unknown;
};

class PagoTICService {
  private readonly baseUrl = env.server.PAGOTIC_BASE_URL;
  private readonly api = axios.create({
    baseURL: this.baseUrl,
    timeout: 20_000, // ↑
  });

  public async createPayment(
    rawOrPromise: CreatePagoPayload | Promise<CreatePagoPayload>
  ): Promise<PagoTICResponse> {
    const raw = await rawOrPromise;
    if (!raw || typeof raw !== "object") {
      throw new Error("PagoTIC: payload inválido (vazio ou não é um objeto).");
    }

    if (!raw.payment_number || raw.payment_number.trim() === "") {
      raw.payment_number = `PAY-${Date.now()}`;
    }

    // 👇 correção de fallback (você setava return_url duas vezes)
    if (!raw.return_url) {
      raw.return_url = `https://entradamaster.vercel.app/checkout/confirmation?orderId=${raw.orderId ?? ""}`;
    }
    if (!raw.back_url) {
      raw.back_url = `https://entradamaster.vercel.app/checkout/confirmation?orderId=${raw.orderId ?? ""}`;
    }

    const payload = createPagoSchema.parse(raw);

    console.info("[PagoTIC] Payload (sanitized)", {
      external_transaction_id: payload.external_transaction_id,
      detailsCount: payload.details?.length ?? 0,
      payerEmail: payload.payer?.email ?? null,
      return_url: payload.return_url,
      back_url: payload.back_url,
      notification_url: payload.notification_url,
      due_date: payload.due_date,
      last_due_date: payload.last_due_date,
    });

    try {
      const token = await getPagoTICToken(); // agora com retry
      const { data } = await this.api.post<PagoTICResponse>("/pagos", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      return data;
    } catch (err) {
      const axiosErr = err as AxiosError<{ code?: number; message?: string; extended_code?: number }>;
      const status = axiosErr.response?.status;
      const errorData = axiosErr.response?.data;

      console.error("[PagoTIC] Erro na criação de pagamento", { status, error: errorData });

      if (errorData?.extended_code === 4120) {
        throw new Error("API PagoTIC: payment_number ausente ou inválido.");
      }
      if (status === 504) {
        throw new Error("A PagoTIC está fora do ar no momento (504). Tente novamente em instantes.");
      }
      throw err;
    }
  }
}

export const pagoticService = new PagoTICService();
