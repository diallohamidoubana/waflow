import { InvalidPermissionError } from './errors.js';

declare const PermissionBrand: unique symbol;

/**
 * Strongly-typed branded identifier for an authorization Permission.
 * Represents a discrete, explicit capability (e.g., "orders.create", "inbox.read").
 * Wildcards, ALL, and implicit permissions are strictly forbidden.
 */
export type Permission = string & { readonly [PermissionBrand]: true };

const FORBIDDEN_PERMISSION_VALUES: ReadonlySet<string> = new Set([
  '*',
  'all',
  'ALL',
  'super',
  'SUPER',
  'admin.*',
  '*.*',
]);

/**
 * Creates and validates a strongly-typed Permission identifier.
 * Rejects non-string, empty, whitespace-only, wildcard, or bypass values.
 *
 * @param value The raw string representation of the permission.
 * @returns A validated, trimmed Permission.
 * @throws {InvalidPermissionError} If the permission is invalid, wildcard, or empty.
 */
export function createPermission(value: string): Permission {
  if (typeof value !== 'string') {
    throw new InvalidPermissionError('Permission must be a string.');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidPermissionError('Permission cannot be empty or whitespace-only.');
  }

  if (FORBIDDEN_PERMISSION_VALUES.has(trimmed)) {
    throw new InvalidPermissionError(
      `Permission "${trimmed}" is forbidden. Wildcards and global ALL bypass permissions are prohibited by security policy.`,
    );
  }

  return trimmed as Permission;
}

/**
 * Type guard to check if a value is a valid Permission string.
 *
 * @param value The unknown value to check.
 * @returns True if value is a non-empty, non-wildcard trimmed string.
 */
export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    !FORBIDDEN_PERMISSION_VALUES.has(value.trim())
  );
}
