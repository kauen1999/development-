// src/modules/pagotic/pagotic.service.ts
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

  private async fetchToken(): Promise<{ token: string; expiresIn: number }> {
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
    return { token: String(data.access_token), expiresIn };
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
    const payload = createPagoSchema.parse(raw);

    const doRequest = async (token: string) => {
      const { data } = await this.api.post<PagoTICResponse>("/pagos", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      return data;
    };

    try {
      const token = await this.getToken();
      return await doRequest(token);
    } catch (e) {
      const err = e as AxiosError<unknown>;
      if (err.response?.status === 401) {
        const { token } = await this.fetchToken(); // force refresh
        this.accessToken = token;
        this.tokenExpiresAt = Date.now() + 5 * 60 * 1000;
        return await doRequest(token);
      }
      // eslint-disable-next-line no-console
      console.error("PagoTIC createPayment error:", err.response?.data ?? err.message);
      throw err;
    }
  }
}

export const pagoticService = new PagoTICService();
