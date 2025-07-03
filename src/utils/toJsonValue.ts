import type { Prisma } from '@prisma/client';

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  const parsed = JSON.parse(JSON.stringify(value));
  if (parsed === null || parsed === undefined) {
    throw new Error('Invalid rawResponse: cannot be null or undefined');
  }
  return parsed as Prisma.InputJsonValue;
}
