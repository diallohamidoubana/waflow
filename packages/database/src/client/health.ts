import type { PrismaClient } from '@prisma/client';
import { getDatabaseClient } from './index.js';

export interface DatabaseHealthResult {
  readonly isHealthy: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

/**
 * Checks PostgreSQL connectivity by executing a lightweight query.
 *
 * @param client Optional PrismaClient instance to test (defaults to internal singleton).
 * @returns Object with health status and round-trip latency.
 */
export async function checkDatabaseHealth(client?: PrismaClient): Promise<DatabaseHealthResult> {
  const db = client ?? getDatabaseClient();
  const startTime = Date.now();

  try {
    // Execute raw SELECT 1 to verify end-to-end database connectivity
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return {
      isHealthy: true,
      latencyMs,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
