import type { RuleId } from './types.js';

export const PACKAGE_ALLOWLISTS: Readonly<Record<string, readonly string[]>> = {
  '@waflow/domain': [],
  '@waflow/contracts': [],
  '@waflow/config': [],
  '@waflow/events': ['@waflow/contracts'],
  '@waflow/observability': ['@waflow/config'],
  '@waflow/security': ['@waflow/contracts', '@waflow/config'],
  '@waflow/database': [
    '@waflow/domain',
    '@waflow/contracts',
    '@waflow/config',
    '@waflow/observability',
  ],
  '@waflow/auth': [
    '@waflow/domain',
    '@waflow/contracts',
    '@waflow/security',
    '@waflow/config',
    '@waflow/observability',
  ],
  '@waflow/ai': [
    '@waflow/domain',
    '@waflow/contracts',
    '@waflow/security',
    '@waflow/config',
    '@waflow/observability',
  ],
  '@waflow/integrations': [
    '@waflow/domain',
    '@waflow/contracts',
    '@waflow/events',
    '@waflow/security',
    '@waflow/config',
    '@waflow/observability',
  ],
  '@waflow/analytics': [
    '@waflow/contracts',
    '@waflow/events',
    '@waflow/config',
    '@waflow/observability',
  ],
  '@waflow/ui': ['@waflow/contracts', '@waflow/config'],
};

export const FRONTEND_APPS = ['@waflow/web', '@waflow/admin', '@waflow/storefront'] as const;

export const FRONTEND_ALLOWED_DEPS: readonly string[] = [
  '@waflow/ui',
  '@waflow/contracts',
  '@waflow/config',
];

export const FRONTEND_FORBIDDEN_DEPS: readonly string[] = [
  '@waflow/database',
  '@waflow/integrations',
  '@waflow/ai',
  '@waflow/events',
  '@waflow/observability',
  '@waflow/analytics',
  '@waflow/security',
];

export const COMPOSITION_APPS = ['@waflow/api', '@waflow/workers', '@waflow/webhooks'] as const;

export const RULE_DESCRIPTIONS: Readonly<Record<RuleId, string>> = {
  'ARCH-001': 'No package under packages/* may import anything from apps/*.',
  'ARCH-002': 'No app under apps/* may import another app.',
  'ARCH-003': '@waflow/domain may not import another @waflow package.',
  'ARCH-004': '@waflow/contracts may not import another @waflow package.',
  'ARCH-005': '@waflow/config may not import another @waflow package.',
  'ARCH-006': "Each package's dependencies must belong to its declared architecture allowlist.",
  'ARCH-007': 'Frontend apps must respect their presentation allowlist.',
  'ARCH-008': 'Cross-package deep imports and cross-workspace relative escapes are forbidden.',
  'ARCH-009': 'Circular dependencies between @waflow packages are forbidden.',
  'ARCH-010': '@waflow/testing must not appear as a production dependency of another workspace.',
  'ARCH-011': 'Unknown @waflow workspace dependencies must fail validation.',
  'ARCH-012': 'Every workspace package name must remain unique.',
};
