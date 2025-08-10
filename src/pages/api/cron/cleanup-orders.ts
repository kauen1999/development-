// src/pages/api/cron/cleanup-orders.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { cleanupExpiredOrders } from "@/jobs/cleanupExpiredOrders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await cleanupExpiredOrders();
    res.status(200).json({ message: "Cleanup completed" });
  } catch (error) {
    console.error("Erro no cleanup:", error);
    res.status(500).json({ error: "Erro ao limpar pedidos expirados" });
  }
}

