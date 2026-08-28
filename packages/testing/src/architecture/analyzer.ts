import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  COMPOSITION_APPS,
  FRONTEND_ALLOWED_DEPS,
  FRONTEND_APPS,
  FRONTEND_FORBIDDEN_DEPS,
  PACKAGE_ALLOWLISTS,
} from './rules.js';
import type {
  AnalyzeArchitectureOptions,
  ArchitectureAnalysisResult,
  ArchitectureViolation,
  ImportReference,
  WorkspaceMeta,
} from './types.js';

/**
 * Checks if a file path is a test or tooling file.
 */
export function isTestOrToolingFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = path.basename(normalized);
  return (
    fileName.includes('.test.') ||
    fileName.includes('.spec.') ||
    fileName.endsWith('.test.ts') ||
    fileName.endsWith('.spec.ts') ||
    fileName.endsWith('.test.js') ||
    fileName.endsWith('.spec.js') ||
    normalized.includes('/_tests_/') ||
    normalized.includes('/__tests__/') ||
    normalized.includes('/test/') ||
    normalized.includes('/tests/')
  );
}

/**
 * Discovers all workspace packages and apps from the monorepo root.
 */
export function discoverWorkspaces(monorepoRoot: string): WorkspaceMeta[] {
  const workspaces: WorkspaceMeta[] = [];
  const searchDirs = [
    { dir: 'apps', kind: 'app' as const },
    { dir: 'packages', kind: 'package' as const },
  ];

  for (const { dir, kind } of searchDirs) {
    const fullDirPath = path.resolve(monorepoRoot, dir);
    if (!fs.existsSync(fullDirPath)) continue;

    const entries = fs.readdirSync(fullDirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const workspacePath = path.join(fullDirPath, entry.name);
      const pkgJsonPath = path.join(workspacePath, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const name = typeof pkgJson.name === 'string' ? pkgJson.name : entry.name;
        const isFrontend = (FRONTEND_APPS as readonly string[]).includes(name);
        const isComposition = (COMPOSITION_APPS as readonly string[]).includes(name);

        workspaces.push({
          name,
          dirName: entry.name,
          absolutePath: path.resolve(workspacePath),
          relativePath: path.relative(monorepoRoot, workspacePath).replace(/\\/g, '/'),
          kind,
          appKind: isFrontend ? 'presentation' : isComposition ? 'composition' : undefined,
          dependencies: (pkgJson.dependencies as Record<string, string>) ?? {},
          devDependencies: (pkgJson.devDependencies as Record<string, string>) ?? {},
          peerDependencies: (pkgJson.peerDependencies as Record<string, string>) ?? {},
          optionalDependencies: (pkgJson.optionalDependencies as Record<string, string>) ?? {},
        });
      } catch (err) {
        console.error(`Failed to parse ${pkgJsonPath}:`, err);
      }
    }
  }

  return workspaces;
}

/**
 * Determines whether candidatePath is inside parentDir (or identical to parentDir).
 * Uses path-aware relative traversal rather than string prefix matching.
 *
 * Correctly distinguishes:
 * A. candidate == root (returns true)
 * B. candidate is inside root (returns true)
 * C. candidate escapes root using .. (returns false)
 * D. candidate is an absolute path outside root / different drive (returns false)
 */
export function isPathInside(
  parentDir: string,
  candidatePath: string,
  pathModule: typeof path.posix | typeof path.win32 | typeof path = path,
): boolean {
  const resolvedParent = pathModule.resolve(parentDir);
  const resolvedCandidate = pathModule.resolve(candidatePath);
  const rel = pathModule.relative(resolvedParent, resolvedCandidate);

  // If relative path is empty, candidatePath is identical to parentDir
  if (rel === '') {
    return true;
  }

  // If relative path is '..' or starts with '..' + sep, it has escaped parentDir
  if (
    rel === '..' ||
    rel.startsWith(`..${pathModule.sep}`) ||
    rel.startsWith('../') ||
    rel.startsWith('..\\')
  ) {
    return false;
  }

  // On Windows, if on different drives/roots, path.relative returns an absolute path
  if (pathModule.isAbsolute(rel)) {
    return false;
  }

  return true;
}

/**
 * Extracts all import and require specifiers from a source file.
 */
export function extractImportsFromSource(
  filePath: string,
  content: string,
  currentWorkspace: WorkspaceMeta,
  allWorkspaces: readonly WorkspaceMeta[],
  pathModule: typeof path.posix | typeof path.win32 | typeof path = path,
): ImportReference[] {
  const references: ImportReference[] = [];
  const lines = content.split('\n');

  const importRegex =
    /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|export\s+[\w*\s{},]*\s+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i];
    if (!lineContent) continue;
    let match: RegExpExecArray | null;
    importRegex.lastIndex = 0;

    while ((match = importRegex.exec(lineContent)) !== null) {
      const rawSpecifier = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!rawSpecifier) continue;

      let isDeepImport = false;
      let targetWorkspaceName: string | undefined = undefined;
      let isCrossWorkspaceRelativeEscape = false;

      if (rawSpecifier.startsWith('@waflow/')) {
        const parts = rawSpecifier.split('/');
        const basePkg = `${parts[0]}/${parts[1]}`;
        targetWorkspaceName = basePkg;

        if (parts.length > 2) {
          isDeepImport = true;
        }
      } else if (rawSpecifier.startsWith('.')) {
        const fileDir = pathModule.dirname(filePath);
        const resolvedAbsolute = pathModule.resolve(fileDir, rawSpecifier);

        // Check if the resolved import stays inside the current workspace
        const staysInCurrentWs = isPathInside(
          currentWorkspace.absolutePath,
          resolvedAbsolute,
          pathModule,
        );

        if (!staysInCurrentWs) {
          // If it escapes the current workspace, check if it enters another workspace
          for (const otherWs of allWorkspaces) {
            if (otherWs.name === currentWorkspace.name) continue;
            if (isPathInside(otherWs.absolutePath, resolvedAbsolute, pathModule)) {
              isCrossWorkspaceRelativeEscape = true;
              targetWorkspaceName = otherWs.name;
              break;
            }
          }
        }
      }

      references.push({
        sourceFile: filePath,
        rawSpecifier,
        line: i + 1,
        isDeepImport,
        targetWorkspaceName,
        isCrossWorkspaceRelativeEscape,
      });
    }
  }

  return references;
}

/**
 * Scans all TypeScript and JavaScript source files in a workspace directory.
 */
export function scanWorkspaceSourceFiles(workspaceDir: string): string[] {
  const sourceFiles: string[] = [];
  const ignoreDirs = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage']);

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const fullPath = path.join(currentDir, entry.name);
        if (
          ['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext) &&
          !isTestOrToolingFile(fullPath)
        ) {
          sourceFiles.push(path.resolve(fullPath));
        }
      }
    }
  }

  walk(workspaceDir);
  return sourceFiles;
}

/**
 * Detects circular dependencies in a dependency graph using DFS.
 */
export function findCyclesInGraph(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = graph.get(node) ?? new Set<string>();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = stack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push([...stack.slice(cycleStartIndex), neighbor]);
        }
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Analyzes and validates all WAFLOW architectural boundaries.
 */
export function analyzeArchitecture(
  options: AnalyzeArchitectureOptions = {},
): ArchitectureAnalysisResult {
  const rootDir = options.monorepoRoot ?? process.cwd();
  const workspaces = options.workspaces ? [...options.workspaces] : discoverWorkspaces(rootDir);
  const violations: ArchitectureViolation[] = [];
  let totalSourceFiles = 0;

  const workspaceMap = new Map<string, WorkspaceMeta>();
  const appNames = new Set<string>();
  const packageNames = new Set<string>();
  const declaredNames = new Set<string>();

  const customFilesMap = options.customFiles ?? options.customSourceFiles;

  // ARCH-012: Check unique workspace names
  for (const ws of workspaces) {
    if (declaredNames.has(ws.name)) {
      violations.push({
        ruleId: 'ARCH-012',
        sourceWorkspace: ws.name,
        offendingTarget: ws.name,
        reason: `Duplicate workspace package name detected: "${ws.name}". Every workspace package name must remain unique.`,
      });
    }
    declaredNames.add(ws.name);
    workspaceMap.set(ws.name, ws);

    if (ws.kind === 'app') {
      appNames.add(ws.name);
    } else {
      packageNames.add(ws.name);
    }
  }

  // Unified dependency graph for cycle detection (ARCH-009)
  const packageDependencyGraph = new Map<string, Set<string>>();
  for (const pkgName of packageNames) {
    packageDependencyGraph.set(pkgName, new Set());
  }

  // 1. Validate package.json declared dependencies
  for (const ws of workspaces) {
    const allDeclaredSections: { section: string; deps: Record<string, string> }[] = [
      { section: 'dependencies', deps: ws.dependencies },
      { section: 'devDependencies', deps: ws.devDependencies },
      { section: 'peerDependencies', deps: ws.peerDependencies ?? {} },
      { section: 'optionalDependencies', deps: ws.optionalDependencies ?? {} },
    ];

    // ARCH-010: @waflow/testing must not be in production dependencies
    if (ws.dependencies['@waflow/testing']) {
      violations.push({
        ruleId: 'ARCH-010',
        sourceWorkspace: ws.name,
        offendingTarget: '@waflow/testing',
        reason:
          '@waflow/testing must not appear as a production dependency. It is strictly for test execution.',
      });
    }

    // ARCH-014: Internal @waflow/* dependencies must use workspace: protocol
    for (const { section, deps } of allDeclaredSections) {
      for (const [depName, versionSpec] of Object.entries(deps)) {
        if (!depName.startsWith('@waflow/')) continue;
        if (!workspaceMap.has(depName)) continue; // Handled by ARCH-011

        if (!versionSpec.startsWith('workspace:')) {
          violations.push({
            ruleId: 'ARCH-014',
            sourceWorkspace: ws.name,
            offendingTarget: depName,
            reason: `Workspace "${ws.name}" declares internal dependency "${depName}" with version "${versionSpec}" in ${section} without using the workspace: protocol (e.g. "workspace:*").`,
          });
        }
      }
    }

    // Check all declared dependencies for boundary rules and build cycle graph
    const allDeclaredDeps = {
      ...ws.dependencies,
      ...ws.peerDependencies,
      ...ws.optionalDependencies,
      ...ws.devDependencies,
    };

    for (const depName of Object.keys(allDeclaredDeps)) {
      if (!depName.startsWith('@waflow/')) continue;

      // ARCH-011: Unknown @waflow workspace dependency
      if (!workspaceMap.has(depName)) {
        violations.push({
          ruleId: 'ARCH-011',
          sourceWorkspace: ws.name,
          offendingTarget: depName,
          reason: `Unknown @waflow workspace dependency "${depName}" declared in package.json.`,
        });
        continue;
      }

      // Record in package dependency graph if both are packages (all declared sections)
      if (ws.kind === 'package' && packageNames.has(depName)) {
        packageDependencyGraph.get(ws.name)?.add(depName);
      }

      // ARCH-001: Package depending on an app
      if (ws.kind === 'package' && appNames.has(depName)) {
        violations.push({
          ruleId: 'ARCH-001',
          sourceWorkspace: ws.name,
          offendingTarget: depName,
          reason: `Package "${ws.name}" cannot depend on application "${depName}". Packages must never depend on applications.`,
        });
      }

      // ARCH-002: App depending on another app
      if (ws.kind === 'app' && appNames.has(depName)) {
        violations.push({
          ruleId: 'ARCH-002',
          sourceWorkspace: ws.name,
          offendingTarget: depName,
          reason: `Application "${ws.name}" cannot depend on another application "${depName}".`,
        });
      }

      // Check production dependency allowlists (dependencies, peerDependencies, optionalDependencies)
      const isProductionDep = Boolean(
        ws.dependencies[depName] ||
        ws.peerDependencies?.[depName] ||
        ws.optionalDependencies?.[depName],
      );
      if (isProductionDep) {
        // ARCH-003: @waflow/domain dependencies
        if (ws.name === '@waflow/domain') {
          violations.push({
            ruleId: 'ARCH-003',
            sourceWorkspace: ws.name,
            offendingTarget: depName,
            reason: `@waflow/domain cannot depend on "${depName}". Domain must remain purely independent with 0 workspace dependencies.`,
          });
        }

        // ARCH-004: @waflow/contracts dependencies
        if (ws.name === '@waflow/contracts') {
          violations.push({
            ruleId: 'ARCH-004',
            sourceWorkspace: ws.name,
            offendingTarget: depName,
            reason: `@waflow/contracts cannot depend on "${depName}". Contracts must remain independent.`,
          });
        }

        // ARCH-005: @waflow/config dependencies
        if (ws.name === '@waflow/config') {
          violations.push({
            ruleId: 'ARCH-005',
            sourceWorkspace: ws.name,
            offendingTarget: depName,
            reason: `@waflow/config cannot depend on "${depName}". Config primitives must remain independent.`,
          });
        }

        // ARCH-006: Package allowlists
        if (ws.kind === 'package' && ws.name !== '@waflow/testing') {
          const allowed = PACKAGE_ALLOWLISTS[ws.name] ?? [];
          if (!allowed.includes(depName)) {
            violations.push({
              ruleId: 'ARCH-006',
              sourceWorkspace: ws.name,
              offendingTarget: depName,
              reason: `Dependency "${depName}" is not in the architecture allowlist for "${ws.name}". Allowed: [${allowed.join(', ') || 'none'}].`,
            });
          }
        }

        // ARCH-007: Frontend apps allowlist & forbidden dependencies
        if (ws.appKind === 'presentation') {
          if ((FRONTEND_FORBIDDEN_DEPS as readonly string[]).includes(depName)) {
            violations.push({
              ruleId: 'ARCH-007',
              sourceWorkspace: ws.name,
              offendingTarget: depName,
              reason: `Frontend application "${ws.name}" cannot depend on backend/infrastructure package "${depName}".`,
            });
          } else if (!(FRONTEND_ALLOWED_DEPS as readonly string[]).includes(depName)) {
            violations.push({
              ruleId: 'ARCH-007',
              sourceWorkspace: ws.name,
              offendingTarget: depName,
              reason: `Dependency "${depName}" is not permitted for frontend application "${ws.name}". Allowed: [${FRONTEND_ALLOWED_DEPS.join(', ')}].`,
            });
          }
        }
      }
    }
  }

  // 2. Validate source code imports & ARCH-013 (No phantom dependencies)
  for (const ws of workspaces) {
    let sourceFiles: readonly { filePath: string; content: string }[] = [];

    if (customFilesMap?.has(ws.name)) {
      sourceFiles = customFilesMap.get(ws.name)!;
    } else {
      const filePaths = scanWorkspaceSourceFiles(ws.absolutePath);
      sourceFiles = filePaths.map((fp) => ({
        filePath: fp,
        content: fs.readFileSync(fp, 'utf-8'),
      }));
    }

    totalSourceFiles += sourceFiles.length;

    const prodDeclared = new Set([
      ...Object.keys(ws.dependencies),
      ...Object.keys(ws.peerDependencies ?? {}),
      ...Object.keys(ws.optionalDependencies ?? {}),
    ]);
    const allDeclared = new Set([...prodDeclared, ...Object.keys(ws.devDependencies)]);

    for (const { filePath, content } of sourceFiles) {
      const isTest = isTestOrToolingFile(filePath);
      const imports = extractImportsFromSource(filePath, content, ws, workspaces);

      for (const imp of imports) {
        // ARCH-008: Deep imports across package boundaries
        if (imp.isDeepImport && imp.targetWorkspaceName) {
          violations.push({
            ruleId: 'ARCH-008',
            sourceWorkspace: ws.name,
            offendingTarget: imp.rawSpecifier,
            sourceFile: filePath,
            line: imp.line,
            reason: `Deep import "${imp.rawSpecifier}" is forbidden. Cross-package imports must use public package entry points (e.g. "${imp.targetWorkspaceName}").`,
          });
        }

        // ARCH-008: Relative imports escaping workspace boundaries
        if (imp.isCrossWorkspaceRelativeEscape && imp.targetWorkspaceName) {
          violations.push({
            ruleId: 'ARCH-008',
            sourceWorkspace: ws.name,
            offendingTarget: imp.rawSpecifier,
            sourceFile: filePath,
            line: imp.line,
            reason: `Relative import "${imp.rawSpecifier}" escapes workspace "${ws.name}" into "${imp.targetWorkspaceName}". Relative cross-workspace imports are forbidden.`,
          });
        }

        const target = imp.targetWorkspaceName;
        if (!target) continue;

        // Harden ARCH-009: Record all cross-package source relationships into cycle graph
        if (ws.kind === 'package' && packageNames.has(target) && target !== ws.name) {
          packageDependencyGraph.get(ws.name)?.add(target);
        }

        // ARCH-013: No phantom dependencies
        if (target !== ws.name && target.startsWith('@waflow/')) {
          if (isTest) {
            // For test/tooling files, devDependencies, optionalDependencies, dependencies or peerDependencies must declare the workspace
            if (!allDeclared.has(target)) {
              violations.push({
                ruleId: 'ARCH-013',
                sourceWorkspace: ws.name,
                offendingTarget: target,
                sourceFile: filePath,
                line: imp.line,
                reason: `Workspace "${ws.name}" imports "${target}" in test file "${filePath}" but the dependency is not declared in package.json (dependencies or devDependencies).`,
              });
            }
          } else {
            // For production source code, must be in dependencies, peerDependencies, or optionalDependencies (NOT only devDependencies)
            if (!prodDeclared.has(target)) {
              const inDev = Boolean(ws.devDependencies[target]);
              violations.push({
                ruleId: 'ARCH-013',
                sourceWorkspace: ws.name,
                offendingTarget: target,
                sourceFile: filePath,
                line: imp.line,
                reason: inDev
                  ? `Workspace "${ws.name}" imports "${target}" in production source code ("${filePath}") but "${target}" is declared only in devDependencies. Production imports must be declared in dependencies, peerDependencies, or optionalDependencies.`
                  : `Workspace "${ws.name}" imports "${target}" in production source code ("${filePath}") but the dependency is not declared in package.json.`,
              });
            }
          }
        }

        // Production boundary checks (ARCH-001, ARCH-002, ARCH-003, ARCH-004, ARCH-005, ARCH-006, ARCH-007)
        if (!isTest) {
          // ARCH-001: Source import from package to app
          if (ws.kind === 'package' && appNames.has(target)) {
            violations.push({
              ruleId: 'ARCH-001',
              sourceWorkspace: ws.name,
              offendingTarget: imp.rawSpecifier,
              sourceFile: filePath,
              line: imp.line,
              reason: `Package "${ws.name}" imports from application "${target}". Packages must never import applications.`,
            });
          }

          // ARCH-002: Source import from app to another app
          if (ws.kind === 'app' && appNames.has(target) && target !== ws.name) {
            violations.push({
              ruleId: 'ARCH-002',
              sourceWorkspace: ws.name,
              offendingTarget: imp.rawSpecifier,
              sourceFile: filePath,
              line: imp.line,
              reason: `Application "${ws.name}" imports from application "${target}". Cross-application imports are forbidden.`,
            });
          }

          // ARCH-003: Source import in @waflow/domain
          if (ws.name === '@waflow/domain' && target !== '@waflow/domain') {
            violations.push({
              ruleId: 'ARCH-003',
              sourceWorkspace: ws.name,
              offendingTarget: imp.rawSpecifier,
              sourceFile: filePath,
              line: imp.line,
              reason: `@waflow/domain source code imports "${target}". Domain logic must remain independent.`,
            });
          }

          // ARCH-004: Source import in @waflow/contracts
          if (ws.name === '@waflow/contracts' && target !== '@waflow/contracts') {
            violations.push({
              ruleId: 'ARCH-004',
              sourceWorkspace: ws.name,
              offendingTarget: imp.rawSpecifier,
              sourceFile: filePath,
              line: imp.line,
              reason: `@waflow/contracts source code imports "${target}". Contracts must remain independent.`,
            });
          }

          // ARCH-005: Source import in @waflow/config
          if (ws.name === '@waflow/config' && target !== '@waflow/config') {
            violations.push({
              ruleId: 'ARCH-005',
              sourceWorkspace: ws.name,
              offendingTarget: imp.rawSpecifier,
              sourceFile: filePath,
              line: imp.line,
              reason: `@waflow/config source code imports "${target}". Config primitives must remain independent.`,
            });
          }

          // ARCH-006: Package source imports allowlist
          if (ws.kind === 'package' && ws.name !== '@waflow/testing' && target !== ws.name) {
            const allowed = PACKAGE_ALLOWLISTS[ws.name] ?? [];
            if (!allowed.includes(target)) {
              violations.push({
                ruleId: 'ARCH-006',
                sourceWorkspace: ws.name,
                offendingTarget: imp.rawSpecifier,
                sourceFile: filePath,
                line: imp.line,
                reason: `Source import "${target}" is not in the architecture allowlist for "${ws.name}". Allowed: [${allowed.join(', ') || 'none'}].`,
              });
            }
          }

          // ARCH-007: Frontend source imports
          if (ws.appKind === 'presentation' && target !== ws.name) {
            if ((FRONTEND_FORBIDDEN_DEPS as readonly string[]).includes(target)) {
              violations.push({
                ruleId: 'ARCH-007',
                sourceWorkspace: ws.name,
                offendingTarget: imp.rawSpecifier,
                sourceFile: filePath,
                line: imp.line,
                reason: `Frontend application "${ws.name}" cannot import from backend package "${target}".`,
              });
            } else if (!(FRONTEND_ALLOWED_DEPS as readonly string[]).includes(target)) {
              violations.push({
                ruleId: 'ARCH-007',
                sourceWorkspace: ws.name,
                offendingTarget: imp.rawSpecifier,
                sourceFile: filePath,
                line: imp.line,
                reason: `Source import "${target}" is not permitted for frontend application "${ws.name}". Allowed: [${FRONTEND_ALLOWED_DEPS.join(', ')}].`,
              });
            }
          }
        }
      }
    }
  }

  // 3. ARCH-009: Detect circular dependencies between packages (manifest + source imports)
  const cycles = findCyclesInGraph(packageDependencyGraph);
  for (const cycle of cycles) {
    violations.push({
      ruleId: 'ARCH-009',
      sourceWorkspace: cycle[0]!,
      offendingTarget: cycle.join(' -> '),
      reason: `Circular dependency detected between packages: ${cycle.join(' -> ')}. Circular dependencies are forbidden.`,
    });
  }

  return {
    success: violations.length === 0,
    violations,
    workspaceCount: workspaces.length,
    sourceFileCount: totalSourceFiles,
  };
}

/**
 * Formats the architecture analysis result into human-readable terminal output.
 */
export function formatArchitectureReport(result: ArchitectureAnalysisResult): string {
  if (result.success) {
    return `[PASS] Architecture boundaries verified cleanly across ${result.workspaceCount} workspaces (${result.sourceFileCount} source files). Zero violations found.`;
  }

  const lines: string[] = [
    `[FAIL] Architecture validation failed with ${result.violations.length} violation(s):\n`,
  ];

  for (let i = 0; i < result.violations.length; i++) {
    const v = result.violations[i]!;
    lines.push(`--------------------------------------------------`);
    lines.push(`Violation #${i + 1}: [${v.ruleId}]`);
    lines.push(`Workspace: ${v.sourceWorkspace}`);
    lines.push(`Target:    ${v.offendingTarget}`);
    if (v.sourceFile) {
      lines.push(`Location:  ${v.sourceFile}${v.line ? `:${v.line}` : ''}`);
    }
    lines.push(`Reason:    ${v.reason}`);
  }
  lines.push(`--------------------------------------------------`);

  return lines.join('\n');
}
