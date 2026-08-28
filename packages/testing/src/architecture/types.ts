export type WorkspaceKind = 'app' | 'package';
export type AppKind = 'composition' | 'presentation';

export interface WorkspaceMeta {
  readonly name: string;
  readonly dirName: string;
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly kind: WorkspaceKind;
  readonly appKind?: AppKind | undefined;
  readonly dependencies: Record<string, string>;
  readonly devDependencies: Record<string, string>;
  readonly peerDependencies?: Record<string, string> | undefined;
  readonly optionalDependencies?: Record<string, string> | undefined;
}

export type RuleId =
  | 'ARCH-001'
  | 'ARCH-002'
  | 'ARCH-003'
  | 'ARCH-004'
  | 'ARCH-005'
  | 'ARCH-006'
  | 'ARCH-007'
  | 'ARCH-008'
  | 'ARCH-009'
  | 'ARCH-010'
  | 'ARCH-011'
  | 'ARCH-012'
  | 'ARCH-013'
  | 'ARCH-014';

export interface ImportReference {
  readonly sourceFile: string;
  readonly rawSpecifier: string;
  readonly line: number;
  readonly isDeepImport: boolean;
  readonly targetWorkspaceName?: string | undefined;
  readonly isCrossWorkspaceRelativeEscape: boolean;
}

export interface ArchitectureViolation {
  readonly ruleId: RuleId;
  readonly sourceWorkspace: string;
  readonly offendingTarget: string;
  readonly reason: string;
  readonly sourceFile?: string | undefined;
  readonly line?: number | undefined;
}

export interface ArchitectureAnalysisResult {
  readonly success: boolean;
  readonly violations: readonly ArchitectureViolation[];
  readonly workspaceCount: number;
  readonly sourceFileCount: number;
}

export interface MockSourceFile {
  readonly filePath: string;
  readonly content: string;
}

export interface AnalyzeArchitectureOptions {
  readonly monorepoRoot?: string | undefined;
  readonly workspaces?: readonly WorkspaceMeta[] | undefined;
  readonly customFiles?: ReadonlyMap<string, readonly MockSourceFile[]> | undefined;
  readonly customSourceFiles?: ReadonlyMap<string, readonly MockSourceFile[]> | undefined;
}
