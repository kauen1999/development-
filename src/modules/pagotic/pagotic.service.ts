import axios from "axios";
import { env } from "@/env";
import type { PagoTICResponse, PagoTICPayload } from "./pagotic.types";

class PagoTICService {
  private baseUrl = env.server.PAGOTIC_BASE_URL;
  private username = env.server.PAGOTIC_USERNAME;
  private password = env.server.PAGOTIC_PASSWORD;

  private async getToken(): Promise<string> {
    const { data } = await axios.post(`${this.baseUrl}/login`, {
      username: this.username,
      password: this.password,
    });
    if (!data?.token) throw new Error("Token não retornado.");
    return data.token;
  }

  public async createPayment(payload: PagoTICPayload): Promise<PagoTICResponse> {
    const token = await this.getToken();
    const { data } = await axios.post(`${this.baseUrl}/payments`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  }
}

export const pagoticService = new PagoTICService();
