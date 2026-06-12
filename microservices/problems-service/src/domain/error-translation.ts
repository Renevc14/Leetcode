import {
  InternalServerError,
  ValidationException,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
} from '@leetcode/problems-server-sdk';

const KNOWN_ERROR_NAMES = new Set([
  'ValidationException',
  'NotFoundError',
  'ForbiddenError',
  'UnauthorizedError',
  'InternalServerError',
]);

function hasName(error: unknown): error is { name: string } {
  return typeof error === 'object' && error !== null && 'name' in error;
}

export function throwIfKnownServiceError(error: unknown): void {
  if (!(error instanceof Error) || !hasName(error)) {
    return;
  }

  if (KNOWN_ERROR_NAMES.has(error.name)) {
    throw error;
  }
}

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

export { ForbiddenError, NotFoundError, UnauthorizedError, ValidationException };
