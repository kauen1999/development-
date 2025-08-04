export function toRFCDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "-0300");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function generateExternalTransactionId(orderId: string): string {
  return `order-${orderId}-${Date.now()}`;
}
