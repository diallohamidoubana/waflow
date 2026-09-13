import type { UserId } from '@waflow/domain';
import type { PrismaClient } from '@prisma/client';
import { getDatabaseClient } from '../client/index.js';
import { DatabaseError } from '../errors/index.js';
import { mapDatabaseUser, type PersistedUser } from '../mappers/user.js';

export interface UserRepository {
  findById(id: UserId): Promise<PersistedUser | null>;
  create(params?: { id?: UserId }): Promise<PersistedUser>;
}

export function createUserRepository(client?: PrismaClient): UserRepository {
  const db = client ?? getDatabaseClient();

  return {
    async findById(id: UserId): Promise<PersistedUser | null> {
      try {
        const record = await db.user.findUnique({
          where: { id },
        });
        return record ? mapDatabaseUser(record) : null;
      } catch (error) {
        throw new DatabaseError(`Failed to query user "${id}".`, error);
      }
    },

    async create(params?: { id?: UserId }): Promise<PersistedUser> {
      try {
        const record = await db.user.create({
          data: params?.id ? { id: params.id } : {},
        });
        return mapDatabaseUser(record);
      } catch (error) {
        throw new DatabaseError('Failed to create user.', error);
      }
    },
  };
}
