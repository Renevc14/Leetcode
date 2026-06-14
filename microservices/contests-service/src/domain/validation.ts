import { ValidationException } from '../application/errors.js';

export function requireString(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw new ValidationException({ message: `Missing required field '${fieldName}'.` });
  }
  return value;
}

export function requireValue<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined) {
    throw new ValidationException({ message: `Missing required field '${fieldName}'.` });
  }
  return value;
}

export function normalizeLimit(limit: number | undefined, defaultLimit = 20): number {
  if (limit === undefined) return defaultLimit;
  return Math.min(Math.max(1, limit), 100);
}
