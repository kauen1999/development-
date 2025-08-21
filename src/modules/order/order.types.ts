import type { OrderStatus } from "@prisma/client";

export interface OrderDTO {
  id: string;
  userId: string;
  eventId: string;
  eventSessionId: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  // No banco pode ser null (embora a gente preencha ao criar)
  expiresAt: Date | null;

  // Campos ligados ao PayPerTIC
  externalTransactionId: string | null;
  paymentNumber: string | null; // "id" do pagamento no PayPerTIC
  formUrl: string | null;       // URL de checkout do PayPerTIC
}

export interface OrderItemDTO {
  ticketCategoryId: string;
  quantity: number;
  // No input do router você NÃO precisa enviar price, o servidor busca do BD.
  // Mantemos opcional porque utils usam preço quando já “enriquecido”.
  price?: number;
}
