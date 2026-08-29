/**
 * Canonical organization roles aligned with the WAFLOW product model.
 * Roles represent membership metadata and classification, NOT direct authorization checks.
 */
export const ORGANIZATION_ROLES = [
  'OWNER',
  'ADMIN',
  'SALES_MANAGER',
  'SALES_AGENT',
  'SUPPORT_AGENT',
  'OPERATIONS_MANAGER',
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

const ROLE_SET: ReadonlySet<string> = new Set(ORGANIZATION_ROLES);

/**
 * Type guard to validate whether a value is a recognized OrganizationRole.
 *
 * @param value The value to check.
 * @returns True if value is a canonical OrganizationRole.
 */
export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === 'string' && ROLE_SET.has(value);
}
