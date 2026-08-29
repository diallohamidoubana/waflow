import { InvalidPermissionError } from './errors.js';

declare const PermissionBrand: unique symbol;

/**
 * Strongly-typed branded identifier for an authorization Permission.
 * Represents a discrete, explicit capability (e.g., "orders.create", "inbox.read").
 * Wildcards, ALL, and implicit permissions are strictly forbidden.
 */
export type Permission = string & { readonly [PermissionBrand]: true };

const FORBIDDEN_BYPASS_TOKENS: ReadonlySet<string> = new Set(['all', 'super', 'admin', 'root']);

function isForbiddenPermission(trimmed: string): boolean {
  // Reject any string containing wildcards ('*', ':*', etc.)
  if (trimmed.includes('*')) {
    return true;
  }

  // Reject case-insensitive global bypass tokens ('ALL', 'all', 'All', etc.)
  const lower = trimmed.toLowerCase();
  if (FORBIDDEN_BYPASS_TOKENS.has(lower)) {
    return true;
  }

  return false;
}

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

  if (isForbiddenPermission(trimmed)) {
    throw new InvalidPermissionError(
      `Permission "${trimmed}" is forbidden. Wildcards ("*") and global ALL/super/admin bypass permissions are prohibited by security policy.`,
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
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && !isForbiddenPermission(trimmed);
}
