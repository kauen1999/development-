import axios, { type AxiosError } from "axios";
import qs from "qs";
import { env } from "@/env";
import { createPagoSchema, type CreatePagoPayload } from "./pagotic.schema";

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
  private readonly authUrl =
    "https://a.paypertic.com/auth/realms/entidades/protocol/openid-connect/token";

  private readonly clientId = env.server.PAGOTIC_CLIENT_ID;
  private readonly clientSecret = env.server.PAGOTIC_CLIENT_SECRET;
  private readonly username = env.server.PAGOTIC_USERNAME;
  private readonly password = env.server.PAGOTIC_PASSWORD;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private readonly api = axios.create({ baseURL: this.baseUrl, timeout: 10_000 });

  private log(section: string, message: unknown, level: "info" | "error" | "debug" = "info") {
    const prefix = `[PagoTIC][${section}]`;
    if (level === "error") {
      console.error(prefix, message);
    } else if (level === "debug") {
      console.debug(prefix, message);
    } else {
      console.log(prefix, message);
    }
  }

  private async fetchToken(): Promise<{ token: string; expiresIn: number }> {
    this.log("Auth", "Solicitando token de acesso...", "debug");

    const form = {
      grant_type: "password",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
    };

    const { data } = await axios.post(this.authUrl, qs.stringify(form), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10_000,
    });

    if (!data?.access_token) throw new Error("PagoTIC: access_token missing in auth response.");

    const expiresIn = Math.max(Number(data.expires_in ?? 0), 300);
    const tokenStr = String(data.access_token);

    // Loga token truncado para debug
    this.log(
      "Auth",
      `Token obtido: ${tokenStr.slice(0, 4)}...${tokenStr.slice(-4)} (expira em ${expiresIn}s)`,
      "info"
    );

    return { token: tokenStr, expiresIn };
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) return this.accessToken;
    const { token, expiresIn } = await this.fetchToken();
    this.accessToken = token;
    this.tokenExpiresAt = now + expiresIn * 1000;
    return token;
  }

  public async createPayment(raw: CreatePagoPayload): Promise<PagoTICResponse> {
    // 🔹 Garante que payment_number está presente
    if (!raw.payment_number) {
      raw.payment_number = `PAY-${Date.now()}`;
      this.log("Payload", `payment_number gerado automaticamente: ${raw.payment_number}`, "debug");
    }

    // 🔹 Valida e transforma payload
    const payload = createPagoSchema.parse(raw);

    // 🔹 Log do payload final
    this.log("Payload", JSON.stringify(payload, null, 2), "debug");

    const doRequest = async (token: string) => {
      try {
        const { data } = await this.api.post<PagoTICResponse>("/pagos", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        this.log("API Response", data, "info");
        return data;
      } catch (err) {
        const axiosErr = err as AxiosError<{ code?: number; message?: string; extended_code?: number }>;
        const errorData = axiosErr.response?.data;

        this.log(
          "API Error",
          {
            status: axiosErr.response?.status,
            error: errorData,
            payloadEnviado: payload,
          },
          "error"
        );

        if (errorData?.extended_code === 4120) {
          throw new Error("API PagoTIC: payment_number ausente ou inválido.");
        }

        throw err;
      }
    };

    try {
      const token = await this.getToken();
      return await doRequest(token);
    } catch (e) {
      const axiosErr = e as AxiosError;
      if (axiosErr.response?.status === 401) {
        this.log("Auth", "Token expirado, solicitando novo...", "debug");
        const { token } = await this.fetchToken();
        this.accessToken = token;
        this.tokenExpiresAt = Date.now() + 5 * 60 * 1000;
        return await doRequest(token);
      }
      throw e;
    }
  }
}

export const pagoticService = new PagoTICService();
