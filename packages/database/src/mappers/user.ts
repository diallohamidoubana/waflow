import { createUserId, type UserId } from '@waflow/domain';
import type { User as PrismaUser } from '@prisma/client';

export interface PersistedUser {
  readonly id: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Maps a database User record into a typed domain representation.
 */
export function mapDatabaseUser(record: PrismaUser): PersistedUser {
  return Object.freeze({
    id: createUserId(record.id),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
