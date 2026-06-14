import { ConflictError, NotFoundError, ValidationException } from '../../application/errors.js';

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
    throw new ConflictError({ message: 'Resource already exists.' });
  }

  if (isPrismaNotFound(error)) {
    throw new NotFoundError({ message: 'Contest not found.' });
  }

  throw new ValidationException({ message: 'Unexpected internal error.' });
}
