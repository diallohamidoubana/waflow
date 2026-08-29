/**
 * Minimal membership lifecycle status required for secure authorization.
 */
export const MEMBERSHIP_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

const STATUS_SET: ReadonlySet<string> = new Set(MEMBERSHIP_STATUSES);

/**
 * Type guard to validate whether a value is a valid MembershipStatus.
 *
 * @param value The value to check.
 * @returns True if value is a valid MembershipStatus.
 */
export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return typeof value === 'string' && STATUS_SET.has(value);
}
