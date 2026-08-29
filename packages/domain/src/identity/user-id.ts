import { InvalidUserIdError } from './errors.js';

declare const UserIdBrand: unique symbol;

/**
 * Strongly-typed branded identifier for a User (Global identity).
 * Prevents accidental assignment of arbitrary unvalidated strings.
 */
export type UserId = string & { readonly [UserIdBrand]: true };

/**
 * Creates and validates a strongly-typed UserId.
 * Rejects non-string, empty, or whitespace-only values.
 *
 * @param value The raw string representation of the user identifier.
 * @returns A validated, trimmed UserId.
 * @throws {InvalidUserIdError} If the provided value is empty or whitespace-only.
 */
export function createUserId(value: string): UserId {
  if (typeof value !== 'string') {
    throw new InvalidUserIdError('UserId must be a string.');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidUserIdError('UserId cannot be empty or whitespace-only.');
  }

  return trimmed as UserId;
}

/**
 * Type guard to check if a value satisfies the UserId constraint.
 *
 * @param value The unknown value to check.
 * @returns True if value is a non-empty trimmed string.
 */
export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && value.trim().length > 0;
}
