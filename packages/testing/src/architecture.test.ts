import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeArchitecture, isPathInside } from './architecture/analyzer.js';
import type { WorkspaceMeta } from './architecture/types.js';

function createMockWorkspace(
  name: string,
  kind: 'app' | 'package',
  options: {
    appKind?: 'composition' | 'presentation';
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    sourceImports?: string[];
    customFiles?: { filePath: string; content: string }[];
  } = {},
): { meta: WorkspaceMeta; files: { filePath: string; content: string }[] } {
  const dirName = name.replace('@waflow/', '');
  const absolutePath = path.resolve('/mock/waflow', kind === 'app' ? 'apps' : 'packages', dirName);

  const meta: WorkspaceMeta = {
    name,
    dirName,
    absolutePath,
    relativePath: `${kind === 'app' ? 'apps' : 'packages'}/${dirName}`,
    kind,
    appKind: options.appKind,
    dependencies: options.dependencies ?? {},
    devDependencies: options.devDependencies ?? {},
    peerDependencies: options.peerDependencies ?? {},
    optionalDependencies: options.optionalDependencies ?? {},
  };

  if (options.customFiles) {
    return { meta, files: options.customFiles };
  }

  const importLines = (options.sourceImports ?? []).map((imp) => `import '${imp}';`).join('\n');
  const files = [
    {
      filePath: path.resolve(absolutePath, 'src', 'index.ts'),
      content: `export const NAME = '${name}';\n${importLines}`,
    },
  ];

  return { meta, files };
}

describe('isPathInside — Path-aware containment utility', () => {
  it('POSIX: should correctly identify files inside a directory', () => {
    expect(isPathInside('/repo/packages/foo', '/repo/packages/foo/src/index.ts', path.posix)).toBe(
      true,
    );
    expect(isPathInside('/repo/packages/foo', '/repo/packages/foo', path.posix)).toBe(true);
    expect(isPathInside('/repo/packages/foo/', '/repo/packages/foo', path.posix)).toBe(true);
    expect(isPathInside('/repo/packages/foo', '/repo/packages/foo/.env', path.posix)).toBe(true);
    expect(
      isPathInside('/repo/packages/foo', '/repo/packages/foo/nested/deep/file.ts', path.posix),
    ).toBe(true);
  });

  it('POSIX: should reject files outside, escaping, or in similarly-prefixed directories', () => {
    // Sibling directory with similar prefix (MUST NOT be confused by startsWith)
    expect(
      isPathInside('/repo/packages/foo', '/repo/packages/foobar/src/index.ts', path.posix),
    ).toBe(false);
    // Sibling directory
    expect(isPathInside('/repo/packages/foo', '/repo/packages/bar/src/index.ts', path.posix)).toBe(
      false,
    );
    // Parent directory
    expect(isPathInside('/repo/packages/foo', '/repo/packages', path.posix)).toBe(false);
    // Escaping relative path
    expect(isPathInside('/repo/packages/foo', '/repo/packages/foo/../../other', path.posix)).toBe(
      false,
    );
  });

  it('Windows: should correctly identify files inside a directory', () => {
    expect(
      isPathInside('C:\\repo\\packages\\foo', 'C:\\repo\\packages\\foo\\src\\index.ts', path.win32),
    ).toBe(true);
    expect(isPathInside('C:\\repo\\packages\\foo', 'C:\\repo\\packages\\foo', path.win32)).toBe(
      true,
    );
    expect(
      isPathInside('C:/repo/packages/foo', 'C:\\repo\\packages\\foo\\src\\index.ts', path.win32),
    ).toBe(true);
  });

  it('Windows: should reject files outside, escaping, cross-drive, or similarly-prefixed directories', () => {
    // Similarly-prefixed sibling
    expect(
      isPathInside(
        'C:\\repo\\packages\\foo',
        'C:\\repo\\packages\\foobar\\src\\index.ts',
        path.win32,
      ),
    ).toBe(false);
    // Cross-drive path
    expect(
      isPathInside('C:\\repo\\packages\\foo', 'D:\\repo\\packages\\foo\\src\\index.ts', path.win32),
    ).toBe(false);
    // Escaping path
    expect(
      isPathInside('C:\\repo\\packages\\foo', 'C:\\repo\\packages\\foo\\..\\..\\other', path.win32),
    ).toBe(false);
  });

  it('Host OS: should validate containment on the current host platform', () => {
    const currentRoot = path.resolve(process.cwd(), 'mock-root');
    const childFile = path.resolve(currentRoot, 'src', 'file.ts');
    const siblingFile = path.resolve(process.cwd(), 'mock-root-sibling', 'file.ts');

    expect(isPathInside(currentRoot, childFile)).toBe(true);
    expect(isPathInside(currentRoot, siblingFile)).toBe(false);
  });
});

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

    const escapingFile = {
      filePath: path.resolve(dbWs.meta.absolutePath, 'src', 'repository.ts'),
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

  // HARDENING TESTS (ARCH-013, ARCH-014, hardened ARCH-009)

  it('Scenario A: should detect allowed workspace import but missing manifest dependency (ARCH-013)', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const events = createMockWorkspace('@waflow/events', 'package', {
      dependencies: {}, // Missing @waflow/contracts
      sourceImports: ['@waflow/contracts'],
    });

    const workspaces = [contracts.meta, events.meta];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [events.meta.name, events.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const phantomViolations = result.violations.filter((v) => v.ruleId === 'ARCH-013');
    expect(phantomViolations.length).toBeGreaterThanOrEqual(1);
    expect(phantomViolations[0]?.reason).toContain('not declared in package.json');
  });

  it('Scenario B: should detect production source importing workspace dependency declared only in devDependencies (ARCH-013)', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const events = createMockWorkspace('@waflow/events', 'package', {
      dependencies: {},
      devDependencies: { '@waflow/contracts': 'workspace:*' },
      sourceImports: ['@waflow/contracts'],
    });

    const workspaces = [contracts.meta, events.meta];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [events.meta.name, events.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const devDepViolations = result.violations.filter((v) => v.ruleId === 'ARCH-013');
    expect(devDepViolations.length).toBeGreaterThanOrEqual(1);
    expect(devDepViolations[0]?.reason).toContain('declared only in devDependencies');
  });

  it('Scenario C: should allow test source importing workspace dependency declared in devDependencies (VALID)', () => {
    const testingPkg = createMockWorkspace('@waflow/testing', 'package');
    const domainPkgPath = path.resolve('/mock/waflow', 'packages', 'domain');
    const domainPkg = createMockWorkspace('@waflow/domain', 'package', {
      devDependencies: { '@waflow/testing': 'workspace:*' },
      customFiles: [
        {
          filePath: path.resolve(domainPkgPath, 'src', 'index.ts'),
          content: `export const DOMAIN = true;`,
        },
        {
          filePath: path.resolve(domainPkgPath, 'src', 'domain.test.ts'),
          content: `import '@waflow/testing';`,
        },
      ],
    });

    const workspaces = [testingPkg.meta, domainPkg.meta];
    const customFiles = new Map([
      [testingPkg.meta.name, testingPkg.files],
      [domainPkg.meta.name, domainPkg.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('Scenario D: should detect internal WAFLOW dependency declared using normal semver instead of workspace: protocol (ARCH-014)', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const events = createMockWorkspace('@waflow/events', 'package', {
      dependencies: { '@waflow/contracts': '^1.0.0' },
    });

    const workspaces = [contracts.meta, events.meta];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [events.meta.name, events.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const protocolViolations = result.violations.filter((v) => v.ruleId === 'ARCH-014');
    expect(protocolViolations.length).toBeGreaterThanOrEqual(1);
    expect(protocolViolations[0]?.reason).toContain('without using the workspace: protocol');
  });

  it('Scenario E: should accept internal WAFLOW dependency using workspace:* (VALID)', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const events = createMockWorkspace('@waflow/events', 'package', {
      dependencies: { '@waflow/contracts': 'workspace:*' },
      sourceImports: ['@waflow/contracts'],
    });

    const workspaces = [contracts.meta, events.meta];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [events.meta.name, events.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('Scenario F: should detect source-level package cycles that attempt to bypass declared dependencies (ARCH-009)', () => {
    const pkgA = createMockWorkspace('@waflow/ai', 'package', {
      dependencies: {},
      sourceImports: ['@waflow/integrations'],
    });
    const pkgB = createMockWorkspace('@waflow/integrations', 'package', {
      dependencies: {},
      sourceImports: ['@waflow/ai'],
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
    expect(cycleViolations[0]?.reason).toContain('Circular dependency detected');
  });

  // FINAL CLOSURE TESTS FOR OPTIONAL DEPENDENCY SEMANTICS & OPTIONAL CYCLE GRAPH

  it('Scenario G: should allow production source to import workspace declared in optionalDependencies (VALID)', () => {
    const contracts = createMockWorkspace('@waflow/contracts', 'package');
    const events = createMockWorkspace('@waflow/events', 'package', {
      optionalDependencies: { '@waflow/contracts': 'workspace:*' },
      sourceImports: ['@waflow/contracts'],
    });

    const workspaces = [contracts.meta, events.meta];
    const customFiles = new Map([
      [contracts.meta.name, contracts.files],
      [events.meta.name, events.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('Scenario H: should detect cycle involving an optionalDependencies edge (ARCH-009)', () => {
    const pkgA = createMockWorkspace('@waflow/ai', 'package', {
      dependencies: { '@waflow/integrations': 'workspace:*' },
    });
    const pkgB = createMockWorkspace('@waflow/integrations', 'package', {
      optionalDependencies: { '@waflow/ai': 'workspace:*' },
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
    expect(cycleViolations[0]?.reason).toContain('Circular dependency detected');
  });

  // CROSS-PLATFORM SELF-TEST EXTENSIONS (Section 7)

  it('Scenario I: should allow relative imports that remain inside their own workspace (VALID)', () => {
    const domainWs = createMockWorkspace('@waflow/domain', 'package');
    const internalFiles = [
      {
        filePath: path.resolve(domainWs.meta.absolutePath, 'src', 'index.ts'),
        content: `import './models/user.js';\nimport '../src/helpers/util.js';`,
      },
      {
        filePath: path.resolve(domainWs.meta.absolutePath, 'src', 'models', 'user.ts'),
        content: `import '../helpers/util.js';\nexport const USER = 'user';`,
      },
      {
        filePath: path.resolve(domainWs.meta.absolutePath, 'src', 'helpers', 'util.ts'),
        content: `export const UTIL = 'util';`,
      },
    ];

    const workspaces = [domainWs.meta];
    const customFiles = new Map([[domainWs.meta.name, internalFiles]]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('Scenario J: should not confuse similarly-prefixed workspace directories when checking escapes (ARCH-008)', () => {
    const coreWs = createMockWorkspace('@waflow/core', 'package');
    const coreExtraWs = createMockWorkspace('@waflow/core-extra', 'package');

    // Escaping import into similarly-named sibling workspace
    const escapingFile = {
      filePath: path.resolve(coreWs.meta.absolutePath, 'src', 'index.ts'),
      content: `import '../../core-extra/src/index.js';`,
    };

    const workspaces = [coreWs.meta, coreExtraWs.meta];
    const customFiles = new Map([
      [coreWs.meta.name, [escapingFile]],
      [coreExtraWs.meta.name, coreExtraWs.files],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const escapeViolations = result.violations.filter((v) => v.ruleId === 'ARCH-008');
    expect(escapeViolations.length).toBeGreaterThanOrEqual(1);
    expect(escapeViolations[0]?.offendingTarget).toBe('../../core-extra/src/index.js');
    expect(escapeViolations[0]?.reason).toContain(
      'escapes workspace "@waflow/core" into "@waflow/core-extra"',
    );
  });

  it('Scenario K: should detect relative cross-workspace escape using actual current-OS filesystem paths (ARCH-008)', () => {
    const wsRootAlpha = path.resolve(process.cwd(), 'mock-fixtures', 'packages', 'alpha');
    const wsRootBeta = path.resolve(process.cwd(), 'mock-fixtures', 'packages', 'beta');

    const alphaWs: WorkspaceMeta = {
      name: '@waflow/alpha',
      dirName: 'alpha',
      absolutePath: wsRootAlpha,
      relativePath: 'packages/alpha',
      kind: 'package',
      dependencies: {},
      devDependencies: {},
    };

    const betaWs: WorkspaceMeta = {
      name: '@waflow/beta',
      dirName: 'beta',
      absolutePath: wsRootBeta,
      relativePath: 'packages/beta',
      kind: 'package',
      dependencies: {},
      devDependencies: {},
    };

    const alphaFiles = [
      {
        filePath: path.resolve(wsRootAlpha, 'src', 'main.ts'),
        content: `import '../../beta/src/index.js';`,
      },
    ];
    const betaFiles = [
      {
        filePath: path.resolve(wsRootBeta, 'src', 'index.ts'),
        content: `export const BETA = true;`,
      },
    ];

    const workspaces = [alphaWs, betaWs];
    const customFiles = new Map([
      ['@waflow/alpha', alphaFiles],
      ['@waflow/beta', betaFiles],
    ]);

    const result = analyzeArchitecture({ workspaces, customFiles });
    expect(result.success).toBe(false);

    const escapeViolations = result.violations.filter((v) => v.ruleId === 'ARCH-008');
    expect(escapeViolations.length).toBeGreaterThanOrEqual(1);
    expect(escapeViolations[0]?.reason).toContain(
      'escapes workspace "@waflow/alpha" into "@waflow/beta"',
    );
  });
});
