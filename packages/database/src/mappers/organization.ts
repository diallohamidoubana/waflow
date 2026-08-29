import { createOrganizationId, type OrganizationId } from '@waflow/domain';
import type { Organization as PrismaOrganization } from '@prisma/client';

export interface PersistedOrganization {
  readonly id: OrganizationId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Maps a database Organization record into a typed domain representation.
 */
export function mapDatabaseOrganization(record: PrismaOrganization): PersistedOrganization {
  return Object.freeze({
    id: createOrganizationId(record.id),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
