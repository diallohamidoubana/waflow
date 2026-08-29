import type {
  MembershipId,
  MembershipStatus,
  OrganizationMembership,
  OrganizationRole,
  TenantContext,
  UserId,
} from '@waflow/domain';
import { Prisma, type PrismaClient } from '@prisma/client';
import { getDatabaseClient } from '../client/index.js';
import { DatabaseError, DuplicateMembershipError } from '../errors/index.js';
import { mapDatabaseMembership } from '../mappers/membership.js';

export interface CreateMembershipParams {
  readonly userId: UserId;
  readonly role: OrganizationRole;
  readonly status?: MembershipStatus;
  readonly membershipId?: MembershipId;
}

export interface MembershipRepository {
  /**
   * Finds an OrganizationMembership by its ID strictly scoped to the active TenantContext.
   * Defense-in-depth: query predicate ensures no cross-tenant information disclosure.
   *
   * @param tenantContext Active tenant execution context.
   * @param membershipId Target membership identifier.
   * @returns Canonical OrganizationMembership if found in this tenant, null otherwise.
   */
  findMembershipById(
    tenantContext: TenantContext,
    membershipId: MembershipId,
  ): Promise<OrganizationMembership | null>;

  /**
   * Finds an OrganizationMembership for a user strictly scoped to the active TenantContext.
   *
   * @param tenantContext Active tenant execution context.
   * @param userId Target user identifier.
   * @returns Canonical OrganizationMembership if user belongs to this tenant, null otherwise.
   */
  findMembershipForUser(
    tenantContext: TenantContext,
    userId: UserId,
  ): Promise<OrganizationMembership | null>;

  /**
   * Lists all memberships belonging to the active Organization in TenantContext.
   *
   * @param tenantContext Active tenant execution context.
   * @returns Array of canonical OrganizationMembership records.
   */
  listMemberships(tenantContext: TenantContext): Promise<readonly OrganizationMembership[]>;

  /**
   * Creates a new membership in the active Organization.
   * Organization is derived strictly from trusted TenantContext (S0-05 provenance rule).
   *
   * @param tenantContext Active tenant execution context.
   * @param params Membership creation payload.
   * @returns Newly created and validated canonical OrganizationMembership.
   * @throws {DuplicateMembershipError} If user already has a membership in this organization.
   * @throws {DatabaseError} If database operation fails.
   */
  createMembership(
    tenantContext: TenantContext,
    params: CreateMembershipParams,
  ): Promise<OrganizationMembership>;
}

export function createMembershipRepository(client?: PrismaClient): MembershipRepository {
  const db = client ?? getDatabaseClient();

  return {
    async findMembershipById(
      tenantContext: TenantContext,
      membershipId: MembershipId,
    ): Promise<OrganizationMembership | null> {
      try {
        // Query predicate scopes strictly by both membership id AND organizationId
        const record = await db.organizationMembership.findFirst({
          where: {
            id: membershipId,
            organizationId: tenantContext.organizationId,
          },
        });

        return record ? mapDatabaseMembership(record) : null;
      } catch (error) {
        throw new DatabaseError(
          `Failed to find membership "${membershipId}" in tenant "${tenantContext.organizationId}".`,
          error,
        );
      }
    },

    async findMembershipForUser(
      tenantContext: TenantContext,
      userId: UserId,
    ): Promise<OrganizationMembership | null> {
      try {
        const record = await db.organizationMembership.findFirst({
          where: {
            userId,
            organizationId: tenantContext.organizationId,
          },
        });

        return record ? mapDatabaseMembership(record) : null;
      } catch (error) {
        throw new DatabaseError(
          `Failed to find membership for user "${userId}" in tenant "${tenantContext.organizationId}".`,
          error,
        );
      }
    },

    async listMemberships(
      tenantContext: TenantContext,
    ): Promise<readonly OrganizationMembership[]> {
      try {
        const records = await db.organizationMembership.findMany({
          where: {
            organizationId: tenantContext.organizationId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        return Object.freeze(records.map(mapDatabaseMembership));
      } catch (error) {
        throw new DatabaseError(
          `Failed to list memberships for tenant "${tenantContext.organizationId}".`,
          error,
        );
      }
    },

    async createMembership(
      tenantContext: TenantContext,
      params: CreateMembershipParams,
    ): Promise<OrganizationMembership> {
      try {
        const record = await db.organizationMembership.create({
          data: {
            ...(params.membershipId ? { id: params.membershipId } : {}),
            userId: params.userId,
            organizationId: tenantContext.organizationId,
            role: params.role,
            status: params.status ?? 'ACTIVE',
          },
        });

        return mapDatabaseMembership(record);
      } catch (error) {
        // Handle PostgreSQL unique constraint violation (P2002 in Prisma)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new DuplicateMembershipError(params.userId, tenantContext.organizationId, error);
        }

        throw new DatabaseError(
          `Failed to create membership for user "${params.userId}" in tenant "${tenantContext.organizationId}".`,
          error,
        );
      }
    },
  };
}
