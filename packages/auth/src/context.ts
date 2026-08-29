import type {
  MembershipId,
  OrganizationId,
  OrganizationMembership,
  OrganizationRole,
  Permission,
  TenantContext,
  UserId,
} from '@waflow/domain';
import { AuthorizationDeniedError, InvalidAuthorizationContextError } from './errors.js';

/**
 * Explicit, immutable authorization context representing an authenticated actor
 * operating inside a specific organization with resolved permissions.
 *
 * No process-global or ambient state.
 */
export interface AuthorizationContext {
  readonly userId: UserId;
  readonly membershipId: MembershipId;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
  readonly permissions: ReadonlySet<Permission>;
}

/**
 * Creates an immutable AuthorizationContext for an active membership and tenant context.
 * Enforces deny-by-default invariants during context creation.
 *
 * @param params Context initialization parameters.
 * @returns An immutable AuthorizationContext.
 * @throws {AuthorizationDeniedError} If membership is suspended or tenant mismatch occurs.
 * @throws {InvalidAuthorizationContextError} If context parameters are missing or invalid.
 */
export function createAuthorizationContext(params: {
  readonly membership: OrganizationMembership;
  readonly tenantContext: TenantContext;
  readonly permissions: Iterable<Permission> | ReadonlySet<Permission>;
}): AuthorizationContext {
  const { membership, tenantContext, permissions } = params;

  if (!membership || !tenantContext) {
    throw new InvalidAuthorizationContextError(
      'Cannot create AuthorizationContext: membership and tenantContext are required.',
    );
  }

  // Security Invariant 1: Membership must be ACTIVE
  if (membership.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError(
      `Cannot establish authorization context: membership "${membership.membershipId}" is ${membership.status}.`,
      {
        reason: 'MEMBERSHIP_INACTIVE',
        organizationId: membership.organizationId,
      },
    );
  }

  // Security Invariant 2: Membership organization must match TenantContext
  if (membership.organizationId !== tenantContext.organizationId) {
    throw new AuthorizationDeniedError(
      `Cannot establish authorization context: membership organization "${membership.organizationId}" does not match tenant context "${tenantContext.organizationId}".`,
      {
        reason: 'TENANT_MISMATCH',
        organizationId: tenantContext.organizationId,
      },
    );
  }

  // Security Invariant 3: Create defensive immutable copy of granted permissions
  const permissionsCopy = new Set<Permission>(permissions);

  return Object.freeze({
    userId: membership.userId,
    membershipId: membership.membershipId,
    organizationId: tenantContext.organizationId,
    role: membership.role,
    permissions: Object.freeze(permissionsCopy),
  });
}
