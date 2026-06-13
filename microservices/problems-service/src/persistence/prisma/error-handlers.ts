import {
  InternalServerError,
  NotFoundError,
  ValidationException,
} from '@leetcode/problems-server-sdk';

export function isPrismaUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const value = error.code;
  return typeof value === 'string' && value === 'P2002';
}

export function isPrismaNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const value = error.code;
  return typeof value === 'string' && value === 'P2025';
}

export function mapUnexpectedError(error: unknown): never {
  if (isPrismaUniqueViolation(error)) {
    throw new ValidationException({ message: 'Unique constraint violation.' });
  }

  if (isPrismaNotFound(error)) {
    throw new NotFoundError({ message: 'Problem not found.' });
  }

  throw new InternalServerError({ message: 'Unexpected internal error.' });
}
