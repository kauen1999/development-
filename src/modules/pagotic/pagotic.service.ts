import axios from "axios";
import { env } from "@/env";
import qs from "qs";
import type { PagoTICResponse, PagoTICPayload } from "./pagotic.types";

class PagoTICService {
  private baseUrl = env.server.PAGOTIC_BASE_URL; // https://api.paypertic.com
  private authUrl = "https://a.paypertic.com/auth/realms/entidades/protocol/openid-connect/token";
  private clientId = env.server.PAGOTIC_CLIENT_ID;
  private clientSecret = env.server.PAGOTIC_CLIENT_SECRET;
  private username = env.server.PAGOTIC_USERNAME;
  private password = env.server.PAGOTIC_PASSWORD;

  private async getToken(): Promise<string> {
    const payload = {
      grant_type: "password",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
    };

    const { data } = await axios.post(this.authUrl, qs.stringify(payload), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!data?.access_token) throw new Error("Token não retornado.");
    return data.access_token;
  }

  public async createPayment(payload: PagoTICPayload): Promise<PagoTICResponse> {
    const token = await this.getToken();
    const { data } = await axios.post(`${this.baseUrl}/pagos`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  }
}

export const pagoticService = new PagoTICService();
