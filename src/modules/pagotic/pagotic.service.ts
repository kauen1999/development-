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
    timeout: 10_000,
  });

  /**
   * Cria um pagamento no PagoTIC
   * Aceita tanto um objeto direto quanto um Promise de objeto
   */
  public async createPayment(
    rawOrPromise: CreatePagoPayload | Promise<CreatePagoPayload>
  ): Promise<PagoTICResponse> {
    //  Normaliza entrada
    const raw = await rawOrPromise;

    if (!raw || typeof raw !== "object") {
      throw new Error("PagoTIC: payload inválido (vazio ou não é um objeto).");
    }

    //  Garante que payment_number está definido
    if (!raw.payment_number || raw.payment_number.trim() === "") {
      raw.payment_number = `PAY-${Date.now()}`;
    }

    //  Define URLs de retorno (success e back) caso não venham do payload
    if (!raw.return_url) {
      raw.return_url = `https://entradamaster.vercel.app/checkout/confirmation?orderId=${raw.orderId ?? ""}`;

    }
    if (!raw.back_url) {
      raw.return_url = `https://entradamaster.vercel.app/checkout/confirmation?orderId=${raw.orderId ?? ""}`;
    }

    // Valida o payload com Zod
    const payload = createPagoSchema.parse(raw);

    // Log seguro para debug
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
