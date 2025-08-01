import axios from "axios";
import { z } from "zod";

// Schema to validate payment payload for Pago TIC
export const createPagoSchema = z.object({
  type: z.enum(["online", "debit", "transfer", "debin", "coupon"]).default("online"),
  collector_id: z.string(),
  return_url: z.string().url(),
  back_url: z.string().url(),
  notification_url: z.string().url(),
  external_transaction_id: z.string(),
  details: z.array(
    z.object({
      concept_id: z.string(),
      concept_description: z.string(),
      amount: z.number(),
      currency_id: z.string().default("ARS"),
    })
  ),
  payer: z.object({
    name: z.string(),
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string(),
      country: z.string().length(3),
    }),
  }),
  due_date: z.string().datetime(),
  last_due_date: z.string().datetime(),
});

// Strict typing for authentication response
interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

// Strict typing for payment creation response
interface PagoTICResponse {
  id: string;
  form_url: string;
  status: string;
  type: string;
  collector_id: string;
  external_transaction_id: string;
  final_amount: number;
  request_date: string;
  [key: string]: string | number | boolean | object | null | undefined;
}

// Pago TIC service class for authentication and payment creation
export class PagoTICService {
  static async authenticate(): Promise<string> {
    const {
      PAGOTIC_USERNAME,
      PAGOTIC_PASSWORD,
      PAGOTIC_CLIENT_ID,
      PAGOTIC_CLIENT_SECRET,
    } = process.env;

    if (
      !PAGOTIC_USERNAME ||
      !PAGOTIC_PASSWORD ||
      !PAGOTIC_CLIENT_ID ||
      !PAGOTIC_CLIENT_SECRET
    ) {
      throw new Error("Missing required PagoTIC environment variables.");
    }

    const response = await axios.post<AuthResponse>(
      "https://a.paypertic.com/auth/realms/entidades/protocol/openid-connect/token",
      new URLSearchParams({
        username: PAGOTIC_USERNAME,
        password: PAGOTIC_PASSWORD,
        grant_type: "password",
        client_id: PAGOTIC_CLIENT_ID,
        client_secret: PAGOTIC_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  }

  static async createPayment(data: z.infer<typeof createPagoSchema>): Promise<PagoTICResponse> {
    const token = await this.authenticate();

    const response = await axios.post<PagoTICResponse>(
      "https://api.paypertic.com/pagos",
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  }
}
