/**
 * Stable, internal machine-readable reasons for authorization denial.
 * Does not leak sensitive information or user data.
 */
export const AUTHORIZATION_DENIAL_REASONS = [
  'TENANT_MISMATCH',
  'MEMBERSHIP_INACTIVE',
  'MEMBERSHIP_USER_MISMATCH',
  'PERMISSION_MISSING',
  'INVALID_CONTEXT',
] as const;

export type AuthorizationDenialReason = (typeof AUTHORIZATION_DENIAL_REASONS)[number];

/**
 * Result of an authorization evaluation.
 * Explicit ALLOW or DENY with a structured, stable reason.
 */
export type AuthorizationDecision =
  | {
      readonly allowed: true;
    }
  | {
      readonly allowed: false;
      readonly reason: AuthorizationDenialReason;
      readonly details?: string | undefined;
    };
