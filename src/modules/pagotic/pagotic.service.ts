// src/modules/pagotic/pagotic.service.ts
import type { AxiosInstance } from "axios";
import axios from "axios";
import { env } from "@/env/server";

class PagoTICService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: env.PAGOTIC_BASE_URL,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async authenticate(): Promise<string> {
    if (this.token) return this.token;

    const formData = new URLSearchParams();
    formData.append("client_id", env.PAGOTIC_CLIENT_ID);
    formData.append("client_secret", env.PAGOTIC_CLIENT_SECRET);
    formData.append("grant_type", "client_credentials");

    // Usa o endpoint de autenticação correto
    const res = await axios.post(env.PAGOTIC_AUTH_URL, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const token = res.data?.access_token;
    if (!token) {
      console.error("[PagoTIC] Resposta inválida ao autenticar:", res.data);
      throw new Error("Falha ao obter access_token do PagoTIC");
    }

    this.token = token;
    return token;
  }

  public async createPayment(payload: Record<string, unknown>) {
    const token = await this.authenticate();
    const res = await this.client.post("/payments", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  }
}

export const pagoticService = new PagoTICService();
