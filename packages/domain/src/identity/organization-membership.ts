import type { OrganizationId } from '../tenancy/organization-id.js';
import type { MembershipId } from './membership-id.js';
import type { MembershipStatus } from './membership-status.js';
import type { OrganizationRole } from './organization-role.js';
import type { UserId } from './user-id.js';

/**
 * Pure immutable domain contract representing the relationship binding
 * exactly one User to exactly one Organization.
 */
export interface OrganizationMembership {
  readonly membershipId: MembershipId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
  readonly status: MembershipStatus;
}

/**
 * Creates an immutable OrganizationMembership instance.
 */
export function createOrganizationMembership(params: {
  readonly membershipId: MembershipId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
  readonly status: MembershipStatus;
}): OrganizationMembership {
  return Object.freeze({
    membershipId: params.membershipId,
    userId: params.userId,
    organizationId: params.organizationId,
    role: params.role,
    status: params.status,
  });
}
