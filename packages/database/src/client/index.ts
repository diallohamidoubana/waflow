import { PrismaClient } from '@prisma/client';

let globalClient: PrismaClient | null = null;

/**
 * Creates a new PrismaClient instance configured with optional custom datasource URL.
 * Internal to @waflow/database.
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined,
  );
}

/**
 * Gets or initializes the module-level singleton PrismaClient instance.
 * Internal to @waflow/database infrastructure.
 */
export function getDatabaseClient(): PrismaClient {
  if (!globalClient) {
    globalClient = createPrismaClient();
  }
  return globalClient;
}

/**
 * Disconnects and resets the internal singleton PrismaClient.
 * Useful for test suite teardown and graceful application shutdown.
 */
export async function disconnectDatabaseClient(): Promise<void> {
  if (globalClient) {
    await globalClient.$disconnect();
    globalClient = null;
  }
}

export * from './health.js';
