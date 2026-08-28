import { describe, expect, it } from 'vitest';
import { analyzeArchitecture } from './architecture/analyzer.js';
import type { WorkspaceMeta } from './architecture/types.js';

function createMockWorkspace(
  name: string,
  kind: 'app' | 'package',
  options: {
    appKind?: 'composition' | 'presentation';
    dependencies?: Record<string, string>;
    sourceImports?: string[];
  } = {},
): { meta: WorkspaceMeta; files: { filePath: string; content: string }[] } {
  const dirName = name.replace('@waflow/', '');
  const absolutePath = `C:/mock/waflow/${kind === 'app' ? 'apps' : 'packages'}/${dirName}`;

  const meta: WorkspaceMeta = {
    name,
    dirName,
    absolutePath,
    relativePath: `${kind === 'app' ? 'apps' : 'packages'}/${dirName}`,
    kind,
    appKind: options.appKind,
    dependencies: options.dependencies ?? {},
    devDependencies: {},
    peerDependencies: {},
  };

  const importLines = (options.sourceImports ?? []).map((imp) => `import '${imp}';`).join('\n');
  const files = [
    {
      filePath: `${absolutePath}/src/index.ts`,
      content: `export const NAME = '${name}';\n${importLines}`,
    },
  ];

  return { meta, files };
}

describe('Architecture Test Engine — Boundary Enforcement', () => {
  it('Scenario 1: should detect forbidden domain dependency (ARCH-003 / ARCH-006)', () => {
    const domainWs = createMockWorkspace('@waflow/domain', 'package', {
      dependencies: { '@waflow/database': 'workspace:*' },
      sourceImports: ['@waflow/database'],
    });
    const dbWs = createMockWorkspace('@waflow/database', 'package');

    const workspaces = [domainWs.meta, dbWs.meta];
    const customFiles = new Map<string, { filePath: string; content: string }[]>([
      [domainWs.meta.name, domainWs.files],
      [dbWs.meta.name, dbWs.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const domainViolations = result.violations.filter(
      (v) => v.sourceWorkspace === '@waflow/domain' && v.ruleId === 'ARCH-003',
    );
    expect(domainViolations.length).toBeGreaterThanOrEqual(1);
    expect(domainViolations[0]?.reason).toContain('Domain must remain');
  });

  it('Scenario 2: should detect app-to-app dependency (ARCH-002)', () => {
    const apiApp = createMockWorkspace('@waflow/api', 'app', {
      appKind: 'composition',
      dependencies: { '@waflow/workers': 'workspace:*' },
      sourceImports: ['@waflow/workers'],
    });
    const workersApp = createMockWorkspace('@waflow/workers', 'app', {
      appKind: 'composition',
    });

    const workspaces = [apiApp.meta, workersApp.meta];
    const customFiles = new Map([
      [apiApp.meta.name, apiApp.files],
      [workersApp.meta.name, workersApp.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const appViolations = result.violations.filter((v) => v.ruleId === 'ARCH-002');
    expect(appViolations.length).toBeGreaterThanOrEqual(1);
    expect(appViolations[0]?.sourceWorkspace).toBe('@waflow/api');
  });

  it('Scenario 3: should detect forbidden frontend -> database dependency (ARCH-007)', () => {
    const webApp = createMockWorkspace('@waflow/web', 'app', {
      appKind: 'presentation',
      dependencies: { '@waflow/database': 'workspace:*' },
      sourceImports: ['@waflow/database'],
    });
    const dbWs = createMockWorkspace('@waflow/database', 'package');

    const workspaces = [webApp.meta, dbWs.meta];
    const customFiles = new Map([
      [webApp.meta.name, webApp.files],
      [dbWs.meta.name, dbWs.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const frontendViolations = result.violations.filter((v) => v.ruleId === 'ARCH-007');
    expect(frontendViolations.length).toBeGreaterThanOrEqual(1);
    expect(frontendViolations[0]?.reason).toContain('Frontend application');
  });

  it('Scenario 4: should detect cross-package deep import (ARCH-008)', () => {
    const dbWs = createMockWorkspace('@waflow/database', 'package', {
      dependencies: { '@waflow/domain': 'workspace:*' },
      sourceImports: ['@waflow/domain/src/internal/entity.js'],
    });
    const domainWs = createMockWorkspace('@waflow/domain', 'package');

    const workspaces = [dbWs.meta, domainWs.meta];
    const customFiles = new Map([
      [dbWs.meta.name, dbWs.files],
      [domainWs.meta.name, domainWs.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const deepViolations = result.violations.filter((v) => v.ruleId === 'ARCH-008');
    expect(deepViolations.length).toBeGreaterThanOrEqual(1);
    expect(deepViolations[0]?.reason).toContain('Deep import');
  });

  it('Scenario 5: should detect relative cross-workspace escaping imports (ARCH-008)', () => {
    const domainWs = createMockWorkspace('@waflow/domain', 'package');
    const dbWs = createMockWorkspace('@waflow/database', 'package');

    // Create a file with relative path escaping into domain
    const escapingFile = {
      filePath: `${dbWs.meta.absolutePath}/src/repository.ts`,
      content: `import '../../domain/src/index.js';`,
    };

    const workspaces = [domainWs.meta, dbWs.meta];
    const customFiles = new Map([
      [domainWs.meta.name, domainWs.files],
      [dbWs.meta.name, [escapingFile]],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const escapeViolations = result.violations.filter((v) => v.ruleId === 'ARCH-008');
    expect(escapeViolations.length).toBeGreaterThanOrEqual(1);
    expect(escapeViolations[0]?.reason).toContain('escapes workspace');
  });

  it('Scenario 6: should detect circular dependencies between packages (ARCH-009)', () => {
    const pkgA = createMockWorkspace('@waflow/ai', 'package', {
      dependencies: { '@waflow/integrations': 'workspace:*' },
    });
    const pkgB = createMockWorkspace('@waflow/integrations', 'package', {
      dependencies: { '@waflow/ai': 'workspace:*' },
    });

    const workspaces = [pkgA.meta, pkgB.meta];
    const customFiles = new Map([
      [pkgA.meta.name, pkgA.files],
      [pkgB.meta.name, pkgB.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const cycleViolations = result.violations.filter((v) => v.ruleId === 'ARCH-009');
    expect(cycleViolations.length).toBeGreaterThanOrEqual(1);
    expect(cycleViolations[0]?.reason).toContain('Circular dependency');
  });

  it('Scenario 7: should detect package importing an app (ARCH-001)', () => {
    const pkg = createMockWorkspace('@waflow/database', 'package', {
      dependencies: { '@waflow/api': 'workspace:*' },
      sourceImports: ['@waflow/api'],
    });
    const app = createMockWorkspace('@waflow/api', 'app', { appKind: 'composition' });

    const workspaces = [pkg.meta, app.meta];
    const customFiles = new Map([
      [pkg.meta.name, pkg.files],
      [app.meta.name, app.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const pkgAppViolations = result.violations.filter((v) => v.ruleId === 'ARCH-001');
    expect(pkgAppViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('Scenario 8: should detect @waflow/testing in production dependencies (ARCH-010)', () => {
    const pkg = createMockWorkspace('@waflow/domain', 'package', {
      dependencies: { '@waflow/testing': 'workspace:*' },
    });

    const workspaces = [pkg.meta];
    const customFiles = new Map([[pkg.meta.name, pkg.files]]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const testingViolations = result.violations.filter((v) => v.ruleId === 'ARCH-010');
    expect(testingViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('Scenario 9: should validate a clean, valid dependency graph with zero violations', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const domain = createMockWorkspace('@waflow/domain', 'package');
    const config = createMockWorkspace('@waflow/config', 'package');
    const observability = createMockWorkspace('@waflow/observability', 'package', {
      dependencies: { '@waflow/config': 'workspace:*' },
      sourceImports: ['@waflow/config'],
    });
    const database = createMockWorkspace('@waflow/database', 'package', {
      dependencies: {
        '@waflow/domain': 'workspace:*',
        '@waflow/contracts': 'workspace:*',
        '@waflow/config': 'workspace:*',
        '@waflow/observability': 'workspace:*',
      },
      sourceImports: ['@waflow/domain', '@waflow/contracts', '@waflow/config'],
    });

    const workspaces = [
      contracts.meta,
      domain.meta,
      config.meta,
      observability.meta,
      database.meta,
    ];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [domain.meta.name, domain.files],
      [config.meta.name, config.files],
      [observability.meta.name, observability.files],
      [database.meta.name, database.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
