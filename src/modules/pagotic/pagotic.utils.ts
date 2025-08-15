// src/modules/pagotic/pagotic.utils.ts

import dayjs from "dayjs";
import { env } from "@/env/server";

/**
 * Generates a unique external transaction ID based on the orderId and current timestamp.
 */
export function generateExternalTransactionId(orderId: string): string {
  // Example format: EXT-<orderId>-<timestamp>
  return `EXT-${orderId}-${Date.now()}`;
}

/**
 * Formats a JavaScript Date into the PagoTIC API's expected datetime format: YYYY-MM-DDTHH:mm:ss
 */
export function formatPagoTICDate(date: Date): string {
  return dayjs(date).format("YYYY-MM-DDTHH:mm:ss");
}

/**
 * Adds minutes to a given date.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return dayjs(date).add(minutes, "minute").toDate();
}

/**
 * Checks available currency with PagoTIC, falls back to ARS if not available or fails.
 */
export async function getAvailableCurrency(preferredCurrency: string): Promise<string> {
  try {
    const res = await fetch(`${env.PAGOTIC_BASE_URL}/currencies`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.warn(`[PagoTIC] Failed to fetch currencies, defaulting to ARS`);
      return "ARS";
    }

    const data = (await res.json()) as { code: string }[];

    // If preferred currency exists, use it
    const match = data.find(
      (currency) => currency.code.toUpperCase() === preferredCurrency.toUpperCase()
    );

    if (match) {
      return match.code.toUpperCase();
    }

    console.warn(`[PagoTIC] Preferred currency not found, defaulting to ARS`);
    return "ARS";
  } catch (error) {
    console.error("[PagoTIC] Error fetching currencies:", error);
    return "ARS";
  }
}
