import { TenantBoundaryViolationError } from './errors.js';
import type { OrganizationId } from './organization-id.js';
import type { TenantContext } from './tenant-context.js';
import type { TenantScoped } from './tenant-scoped.js';

export type TenantIdentifiable = TenantScoped | TenantContext | OrganizationId;

/**
 * Helper to extract OrganizationId from any tenant-identifiable object.
 */
function extractOrganizationId(target: TenantIdentifiable): OrganizationId {
  if (typeof target === 'string') {
    return target;
  }
  return target.organizationId;
}

/**
 * Checks whether two tenant-identifiable targets belong to the same organization.
 *
 * @param a First tenant-identifiable target (Resource, Context, or OrganizationId).
 * @param b Second tenant-identifiable target (Resource, Context, or OrganizationId).
 * @returns True if both targets share identical organization IDs.
 */
export function isSameOrganization(a: TenantIdentifiable, b: TenantIdentifiable): boolean {
  const orgA = extractOrganizationId(a);
  const orgB = extractOrganizationId(b);
  return orgA === orgB;
}

/**
 * Asserts that two tenant-identifiable targets belong to the same organization.
 * Throws a TenantBoundaryViolationError if a cross-tenant mismatch is detected.
 *
 * @param a First tenant-identifiable target.
 * @param b Second tenant-identifiable target.
 * @param customMessage Optional custom error message.
 * @throws {TenantBoundaryViolationError} If organization IDs do not match.
 */
export function assertSameOrganization(
  a: TenantIdentifiable,
  b: TenantIdentifiable,
  customMessage?: string,
): void {
  const orgA = extractOrganizationId(a);
  const orgB = extractOrganizationId(b);

  if (orgA !== orgB) {
    const message =
      customMessage ??
      `Tenant boundary violation: cross-organization operation between "${orgA}" and "${orgB}" is forbidden.`;
    throw new TenantBoundaryViolationError(message, {
      expectedOrganizationId: orgA,
      actualOrganizationId: orgB,
    });
  }
}

/**
 * Asserts that a tenant-scoped resource matches the active TenantContext.
 * Throws a TenantBoundaryViolationError if the resource belongs to another organization.
 *
 * @param resource The tenant-scoped resource.
 * @param context The active operation TenantContext.
 * @param customMessage Optional custom error message.
 * @throws {TenantBoundaryViolationError} If resource organization does not match context organization.
 */
export function assertResourceMatchesContext(
  resource: TenantScoped,
  context: TenantContext,
  customMessage?: string,
): void {
  if (resource.organizationId !== context.organizationId) {
    const message =
      customMessage ??
      `Tenant boundary violation: resource owned by organization "${resource.organizationId}" cannot be accessed in tenant context "${context.organizationId}".`;
    throw new TenantBoundaryViolationError(message, {
      expectedOrganizationId: context.organizationId,
      actualOrganizationId: resource.organizationId,
    });
  }
}
