import { isOrganizationId, type OrganizationId } from '../tenancy/organization-id.js';
import {
  InvalidMembershipIdError,
  InvalidMembershipStatusError,
  InvalidOrganizationRoleError,
  InvalidUserIdError,
} from './errors.js';
import { isMembershipId, type MembershipId } from './membership-id.js';
import { isMembershipStatus, type MembershipStatus } from './membership-status.js';
import { isOrganizationRole, type OrganizationRole } from './organization-role.js';
import { isUserId, type UserId } from './user-id.js';

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
 * Creates an immutable OrganizationMembership instance with strict runtime validation.
 *
 * @throws {InvalidMembershipIdError} If membershipId is invalid.
 * @throws {InvalidUserIdError} If userId is invalid.
 * @throws {InvalidOrganizationIdError} If organizationId is invalid.
 * @throws {InvalidOrganizationRoleError} If role is not a recognized canonical role.
 * @throws {InvalidMembershipStatusError} If status is not a recognized lifecycle status.
 */
export function createOrganizationMembership(params: {
  readonly membershipId: MembershipId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
  readonly status: MembershipStatus;
}): OrganizationMembership {
  if (!params) {
    throw new Error('OrganizationMembership parameters are required.');
  }

  if (!isMembershipId(params.membershipId)) {
    throw new InvalidMembershipIdError('Invalid membershipId provided to OrganizationMembership.');
  }

  if (!isUserId(params.userId)) {
    throw new InvalidUserIdError('Invalid userId provided to OrganizationMembership.');
  }

  if (!isOrganizationId(params.organizationId)) {
    throw new Error('Invalid organizationId provided to OrganizationMembership.');
  }

  if (!isOrganizationRole(params.role)) {
    throw new InvalidOrganizationRoleError(
      `Invalid organization role "${String(params.role)}". Must be a canonical OrganizationRole.`,
    );
  }

  if (!isMembershipStatus(params.status)) {
    throw new InvalidMembershipStatusError(
      `Invalid membership status "${String(params.status)}". Must be ACTIVE or SUSPENDED.`,
    );
  }

  return Object.freeze({
    membershipId: params.membershipId,
    userId: params.userId,
    organizationId: params.organizationId,
    role: params.role,
    status: params.status,
  });
}
