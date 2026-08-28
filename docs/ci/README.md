# WAFLOW Continuous Integration (CI) Pipeline

## 1. Overview & Core Principle

> **WAFLOW Engineering Principle:**  
> _A local PASS is necessary but not sufficient. A change intended for `main` must also receive an independent PASS from remote CI._

The WAFLOW CI pipeline is automated via GitHub Actions to ensure deterministic verification of all contributions before and upon merging to `main`.

---

## 2. Triggering Events

The CI workflow ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) triggers on:

1. **Pull Requests**: Any PR targeting `main`.
2. **Pushes**: Direct pushes or merges into `main`.
3. **Manual Dispatch**: On-demand execution via GitHub Actions `workflow_dispatch`.

_Note: `pull_request_target` is strictly forbidden to prevent untrusted code from executing with elevated permissions._

---

## 3. Runtime Baseline & Cross-Platform Matrix

Every run executes across an operating system matrix to guarantee cross-platform compatibility:

- **Operating Systems**:
  - `ubuntu-latest` (Linux production server baseline)
  - `windows-latest` (Windows developer workstation baseline)
- **Node.js**: `22.14.0` (Pinned Node 22 LTS baseline)
- **Package Manager**: `pnpm@9.15.4`
- **Dependency Caching**: pnpm store caching via `actions/setup-node`
- **Job Timeout**: `20 minutes` per job

---

## 4. Frozen Dependency Installation

All dependencies in CI are installed with:

```bash
pnpm install --frozen-lockfile
```

If `package.json` manifests and `pnpm-lock.yaml` diverge, the CI pipeline fails immediately. Automatic lockfile updates are never performed in CI.

---

## 5. Mandatory Quality Gates

Each matrix runner executes all six mandatory quality gates sequentially without bypass (`continue-on-error: false`):

| Step | Command                  | Description                                                                   |
| :--- | :----------------------- | :---------------------------------------------------------------------------- |
| 1    | `pnpm format:check`      | Prettier code style validation                                                |
| 2    | `pnpm lint`              | ESLint flat configuration check                                               |
| 3    | `pnpm typecheck`         | TypeScript compiler type validation (`tsc --noEmit`) across all 19 workspaces |
| 4    | `pnpm test:architecture` | Architecture boundary checker enforcing rules **ARCH-001 through ARCH-014**   |
| 5    | `pnpm test`              | Vitest automated unit and self-verification test suites                       |
| 6    | `pnpm build`             | Turborepo compilation of all applications and packages                        |

A failure at any step immediately aborts the run and flags the pull request as failing.

---

## 6. Security & Permissions

1. **Least Privilege**: The workflow explicitly sets:
   ```yaml
   permissions:
     contents: read
   ```
   No repository write access or special administrative permissions are granted to CI jobs.
2. **Zero Secrets Requirement**: The CI pipeline does not require or expose any application secrets, API keys, or production credentials.
3. **Concurrency & Cancellation**: Redundant/obsolete CI runs for the same branch or PR are automatically cancelled via `concurrency` with `cancel-in-progress: true`.

---

## 7. Local Reproduction

To reproduce the exact CI validation pipeline locally before pushing:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:architecture
pnpm test
pnpm build
```

---

## 8. Line Ending Policy

WAFLOW canonical repository text line endings are LF (`\n`). This is enforced repository-wide across Windows and Linux environments via [`.gitattributes`](../../.gitattributes) and Prettier (`endOfLine: 'lf'`).
