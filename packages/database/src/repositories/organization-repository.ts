import type { OrganizationId } from '@waflow/domain';
import type { PrismaClient } from '@prisma/client';
import { getDatabaseClient } from '../client/index.js';
import { DatabaseError } from '../errors/index.js';
import { mapDatabaseOrganization, type PersistedOrganization } from '../mappers/organization.js';

export interface OrganizationRepository {
  findById(id: OrganizationId): Promise<PersistedOrganization | null>;
  create(params?: { id?: OrganizationId }): Promise<PersistedOrganization>;
}

export function createOrganizationRepository(client?: PrismaClient): OrganizationRepository {
  const db = client ?? getDatabaseClient();

  return {
    async findById(id: OrganizationId): Promise<PersistedOrganization | null> {
      try {
        const record = await db.organization.findUnique({
          where: { id },
        });
        return record ? mapDatabaseOrganization(record) : null;
      } catch (error) {
        throw new DatabaseError(`Failed to query organization "${id}".`, error);
      }
    },

    async create(params?: { id?: OrganizationId }): Promise<PersistedOrganization> {
      try {
        const record = await db.organization.create({
          data: params?.id ? { id: params.id } : {},
        });
        return mapDatabaseOrganization(record);
      } catch (error) {
        throw new DatabaseError('Failed to create organization.', error);
      }
    },
  };
}
