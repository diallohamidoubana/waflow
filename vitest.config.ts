import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@waflow/domain': resolve(__dirname, 'packages/domain/src/index.ts'),
      '@waflow/auth': resolve(__dirname, 'packages/auth/src/index.ts'),
      '@waflow/database': resolve(__dirname, 'packages/database/src/index.ts'),
      '@waflow/config': resolve(__dirname, 'packages/config/src/index.ts'),
      '@waflow/contracts': resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@waflow/events': resolve(__dirname, 'packages/events/src/index.ts'),
      '@waflow/observability': resolve(__dirname, 'packages/observability/src/index.ts'),
      '@waflow/security': resolve(__dirname, 'packages/security/src/index.ts'),
      '@waflow/testing': resolve(__dirname, 'packages/testing/src/index.ts'),
    },
  },
});
