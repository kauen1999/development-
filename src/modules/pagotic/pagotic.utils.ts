// Generates a unique external_transaction_id based on order ID and timestamp
export function generateExternalTransactionId(orderId: string): string {
  return `order-${orderId}-${Date.now()}`;
}

// Formats a numeric amount into a fixed two-decimal string (e.g., "100.00")
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

// Converts a Date object to an ISO string (RFC 822 compatible for PagoTIC API)
export function toRFCDate(date: Date): string {
  return date.toISOString();
}

// Adds a specified number of minutes to a given Date
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
