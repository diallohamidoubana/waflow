# ADR-0002: Machine-Enforced Architectural Boundaries

## Status

**Accepted**

## Context

As WAFLOW scales, development will involve multiple human engineers and autonomous AI agents contributing simultaneously. Without automated enforcement, modular monolithic architectures naturally suffer from architectural drift: developers introduce shortcut imports, frontends query databases directly, domains depend on framework SDKs, and circular dependencies creep in.

Manual code reviews cannot reliably catch subtle dependency inversions or relative path escapes across dozens of packages.

## Decision

All architectural boundaries, dependency allowlists, and import rules in WAFLOW are **machine-enforced** via an automated architecture test engine (`pnpm test:architecture`).

### Dependency Rule Philosophy

1. **Domain Purity**: `@waflow/domain` has zero internal or external framework dependencies. Core business concepts must survive any technology migration.
2. **Explicit Allowlists**: Every workspace package and application has an explicit, strict allowlist of permissible `@waflow/*` dependencies. Undeclared dependencies cause immediate build/test failures.
3. **Dual Validation**: The architecture engine validates both declared `package.json` dependencies and concrete source file AST import statements.
4. **Boundary Integrity**: Deep imports across package boundaries and relative path escapes (`../../other-package`) are strictly prohibited.
5. **Acyclic Graphs**: Circular dependencies between workspace packages are strictly forbidden and checked at commit time.
6. **Frontend Decoupling**: Presentation applications (`apps/web`, `apps/admin`, `apps/storefront`) cannot import backend infrastructure or database packages.

## Consequences

### Positive

- **Deterministic Quality**: Architectural violations are caught instantly in local development and continuous integration.
- **Agent Safety**: Autonomous AI agents cannot inadvertently violate system boundaries.
- **Maintainable Modularity**: Preserves clean boundaries required for future service extraction.

### Negative / Trade-offs

- Adding new legitimate package dependencies requires updating the architecture allowlist with deliberate justification.
