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
  private readonly api = axios.create({ baseURL: this.baseUrl, timeout: 10_000 });

  public async createPayment(raw: CreatePagoPayload): Promise<PagoTICResponse> {
    if (!raw.payment_number || raw.payment_number.trim() === "") {
      raw.payment_number = `PAY-${Date.now()}`;
    }

    const payload = createPagoSchema.parse(raw);
    console.log("[PagoTIC] Payload enviado:", JSON.stringify(payload, null, 2));

    try {
      const token = await getPagoTICToken();
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
      const errorData = axiosErr.response?.data;

      console.error("[PagoTIC] Erro na criação de pagamento", {
        status: axiosErr.response?.status,
        error: errorData,
      });

      if (errorData?.extended_code === 4120) {
        throw new Error("API PagoTIC: payment_number ausente ou inválido.");
      }

      throw err;
    }
  }
}

export const pagoticService = new PagoTICService();
