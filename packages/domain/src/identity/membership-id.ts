import { InvalidMembershipIdError } from './errors.js';

declare const MembershipIdBrand: unique symbol;

/**
 * Strongly-typed branded identifier for an Organization Membership.
 * Represents the unique relation binding one User to one Organization.
 */
export type MembershipId = string & { readonly [MembershipIdBrand]: true };

/**
 * Creates and validates a strongly-typed MembershipId.
 * Rejects non-string, empty, or whitespace-only values.
 *
 * @param value The raw string representation of the membership identifier.
 * @returns A validated, trimmed MembershipId.
 * @throws {InvalidMembershipIdError} If the provided value is empty or whitespace-only.
 */
export function createMembershipId(value: string): MembershipId {
  if (typeof value !== 'string') {
    throw new InvalidMembershipIdError('MembershipId must be a string.');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidMembershipIdError('MembershipId cannot be empty or whitespace-only.');
  }

  return trimmed as MembershipId;
}

/**
 * Type guard to check if a value satisfies the MembershipId constraint.
 *
 * @param value The unknown value to check.
 * @returns True if value is a non-empty trimmed string.
 */
export function isMembershipId(value: unknown): value is MembershipId {
  return typeof value === 'string' && value.trim().length > 0;
}
