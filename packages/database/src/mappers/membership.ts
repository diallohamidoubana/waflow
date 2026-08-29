import {
  createMembershipId,
  createOrganizationId,
  createOrganizationMembership,
  createUserId,
  type OrganizationMembership,
  type OrganizationRole,
  type MembershipStatus,
} from '@waflow/domain';
import type { OrganizationMembership as PrismaMembership } from '@prisma/client';

/**
 * Maps a database OrganizationMembership record into the canonical domain OrganizationMembership.
 * Guarantees domain runtime factory validation is invoked on every field.
 *
 * @param record Database record.
 * @returns Pure immutable domain OrganizationMembership contract.
 */
export function mapDatabaseMembership(record: PrismaMembership): OrganizationMembership {
  return createOrganizationMembership({
    membershipId: createMembershipId(record.id),
    userId: createUserId(record.userId),
    organizationId: createOrganizationId(record.organizationId),
    role: record.role as OrganizationRole,
    status: record.status as MembershipStatus,
  });
}
