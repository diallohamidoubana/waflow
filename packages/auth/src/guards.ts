import type { OrganizationId, OrganizationMembership, TenantContext, UserId } from '@waflow/domain';
import { AuthorizationDeniedError } from './errors.js';

/**
 * Asserts that an organization membership is ACTIVE.
 * Throws AuthorizationDeniedError if the membership is SUSPENDED.
 *
 * @param membership The membership to validate.
 * @throws {AuthorizationDeniedError} If membership is not ACTIVE.
 */
export function assertActiveMembership(membership: OrganizationMembership): void {
  if (membership.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError(
      `Membership "${membership.membershipId}" is ${membership.status}. Operations are denied.`,
      {
        reason: 'MEMBERSHIP_INACTIVE',
        organizationId: membership.organizationId,
      },
    );
  }
}

/**
 * Asserts that an organization membership matches the target TenantContext or OrganizationId.
 * Throws AuthorizationDeniedError if there is an organization mismatch.
 *
 * @param membership The membership to validate.
 * @param tenant The active tenant context or organization identifier.
 * @throws {AuthorizationDeniedError} If membership organization does not match tenant.
 */
export function assertMembershipMatchesTenant(
  membership: OrganizationMembership,
  tenant: TenantContext | OrganizationId,
): void {
  const targetOrgId = typeof tenant === 'string' ? tenant : tenant.organizationId;

  if (membership.organizationId !== targetOrgId) {
    throw new AuthorizationDeniedError(
      `Membership organization "${membership.organizationId}" does not match target tenant "${targetOrgId}". Cross-tenant access is prohibited.`,
      {
        reason: 'TENANT_MISMATCH',
        organizationId: targetOrgId,
      },
    );
  }
}

/**
 * Asserts that an organization membership belongs to the specified UserId.
 *
 * @param membership The membership to validate.
 * @param userId The expected user identifier.
 * @throws {AuthorizationDeniedError} If membership does not belong to the user.
 */
export function assertMembershipMatchesUser(
  membership: OrganizationMembership,
  userId: UserId,
): void {
  if (membership.userId !== userId) {
    throw new AuthorizationDeniedError(
      `Membership "${membership.membershipId}" does not belong to user "${userId}".`,
      {
        reason: 'MEMBERSHIP_USER_MISMATCH',
        organizationId: membership.organizationId,
      },
    );
  }
}
