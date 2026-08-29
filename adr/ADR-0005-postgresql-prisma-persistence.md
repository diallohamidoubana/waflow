# ADR-0005: PostgreSQL and Prisma Persistence Architecture

## Status

Accepted

## Context

WAFLOW requires a production-grade relational datastore for its multi-tenant conversational commerce operating system. The persistence architecture must enforce strict organization tenant boundaries, maintain framework and ORM independence for `@waflow/domain`, ensure deterministic migrations, and provide a developer-friendly local environment without leaking infrastructure details into business logic.

## Decision

1. **Canonical Datastore:** Adopt **PostgreSQL 17+** as WAFLOW's primary transactional relational datastore.
2. **Persistence Adapter:** Adopt **Prisma ORM** strictly contained within the `@waflow/database` package.
3. **Domain Independence:** `@waflow/domain` maintains zero dependencies on Prisma, SQL, or database drivers. Persistence mappers explicitly pass data through domain factory functions (`createMembershipId`, `createUserId`, `createOrganizationId`, `createOrganizationMembership`).
4. **Identifier Strategy:** Store identifiers as PostgreSQL `UUID` columns with `gen_random_uuid()` defaults, mapped to domain branded strings.
5. **Tenant Scoping:** All tenant-owned data must include `organization_id UUID NOT NULL` referencing `organizations(id)` and all repository queries must scope directly by `TenantContext.organizationId`.
6. **Migration Discipline:** All schema evolutions must be source-controlled Prisma migrations deployed via `prisma migrate deploy`. `prisma db push` is prohibited in production/CI workflows.
7. **Local Environment:** Provide `compose.yaml` for a containerized PostgreSQL 17 local environment with health checks and localhost-only binding.

## Consequences

### Positive

- Strict data integrity, foreign keys, and unique constraints enforced by PostgreSQL at the storage engine level.
- Clean architectural boundary: domain logic remains pure and testable without database dependencies.
- Deterministic, version-controlled schema evolution verifiable in CI.
- Immediate defense-in-depth against cross-tenant data leakage via repository predicate scoping.

### Negative / Trade-offs

- Integration tests requiring a live PostgreSQL instance need a running database service (handled via Docker locally and GitHub Actions service containers in CI).
- Mapping between Prisma records and domain objects requires explicit mapper maintenance.

## Rejected Alternatives

- **SQLite:** Incompatible with multi-tenant concurrent writes and production distributed hosting requirements.
- **MongoDB / Document DB:** Lack of relational constraints, foreign keys, and atomic multi-entity consistency needed for commerce invariants.
- **Prisma Leaking into Domain:** Violates clean architecture and couples domain models to ORM code generation.
- **`db push` in Production:** Unsafe, non-deterministic schema changes without audit trails.
- **Premature RLS:** Deferring PostgreSQL RLS until connection pooling and worker context semantics are established prevents false-security traps.
