import { InvalidOrganizationIdError } from './errors.js';

declare const OrganizationIdBrand: unique symbol;

/**
 * Strongly-typed branded identifier for an Organization (Tenant boundary).
 * Prevents accidental assignment or interchange of arbitrary unvalidated strings.
 */
export type OrganizationId = string & { readonly [OrganizationIdBrand]: true };

/**
 * Creates and validates a strongly-typed OrganizationId.
 * Rejects non-string, empty, or whitespace-only values.
 *
 * @param value The raw string representation of the organization identifier.
 * @returns A validated, trimmed OrganizationId.
 * @throws {InvalidOrganizationIdError} If the provided value is empty or whitespace-only.
 */
export function createOrganizationId(value: string): OrganizationId {
  if (typeof value !== 'string') {
    throw new InvalidOrganizationIdError('OrganizationId must be a string.');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidOrganizationIdError('OrganizationId cannot be empty or whitespace-only.');
  }

  return trimmed as OrganizationId;
}

/**
 * Type guard to check if a value satisfies the OrganizationId constraint.
 *
 * @param value The unknown value to check.
 * @returns True if value is a non-empty trimmed string.
 */
export function isOrganizationId(value: unknown): value is OrganizationId {
  return typeof value === 'string' && value.trim().length > 0;
}
