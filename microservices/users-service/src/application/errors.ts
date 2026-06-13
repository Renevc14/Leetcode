import {
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationException,
} from '@leetcode/users-server-sdk';

const KNOWN_ERROR_NAMES = new Set([
  'ValidationException',
  'NotFoundError',
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

export { InternalServerError, NotFoundError, UnauthorizedError, ValidationException };
