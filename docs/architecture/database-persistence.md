# Database & Persistence Architecture

This document establishes WAFLOW's persistence architecture, database conventions, tenant isolation invariants at the storage layer, and migration discipline.

---

## 1. Core Architectural Law

The dependency direction between domain logic and persistence is strictly unidirectional:

```text
┌─────────────────────────────────────────────────────────┐
│                    @waflow/domain                       │
│  (Pure domain models, TenantContext, Membership, etc.)   │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │  depends on (allowlisted)
┌─────────────────────────────────────────────────────────┐
│                   @waflow/database                      │
│      (Prisma, PostgreSQL schemas, repositories, SQL)    │
└─────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Domain Independence:** `@waflow/domain` has **zero dependencies** and knows nothing about Prisma, PostgreSQL, SQL, connection pools, migration files, or ORM types. Prisma types, clients, and generated models must never leak outside `@waflow/database`.

---

## 2. Canonical Database & Persistence Adapter

- **Transactional Datastore:** **PostgreSQL 17+** is the canonical relational datastore for all WAFLOW core business state.
- **Persistence Adapter:** **Prisma** is utilized as the type-safe persistence adapter within `@waflow/database`.
- **Public API Boundary:** `@waflow/database` does **not** expose a raw `PrismaClient` to application consumers. It exposes focused, tenant-safe repository interfaces (`MembershipRepository`, `OrganizationRepository`, `UserRepository`), typed domain errors, and health check operations.

---

## 3. Canonical Identifiers & Storage Strategy

1. **Domain Identifiers:** `OrganizationId`, `UserId`, `MembershipId` are strongly-typed opaque branded strings at the domain layer.
2. **Storage Representation:** Identifiers are stored as PostgreSQL `UUID` (`gen_random_uuid()` default in PostgreSQL 17).
3. **Identifier Generation Authority:** Persistence infrastructure generates new UUIDs upon record creation. Domain models accept and validate them without depending on UUID libraries.

---

## 4. Foundational Models

```text
┌────────────────────────┐                   ┌────────────────────────┐
│     organizations      │                   │         users          │
│────────────────────────│                   │────────────────────────│
│ id: UUID (PK)          │                   │ id: UUID (PK)          │
│ created_at: TIMESTAMPTZ│                   │ created_at: TIMESTAMPTZ│
│ updated_at: TIMESTAMPTZ│                   │ updated_at: TIMESTAMPTZ│
└───────────┬────────────┘                   └───────────┬────────────┘
            │ 1                                          │ 1
            │                                            │
            │              ┌───────────────────────────┐ │
            └──────────── N│ organization_memberships  │N┘
                           │───────────────────────────│
                           │ id: UUID (PK)             │
                           │ user_id: UUID (FK)        │
                           │ organization_id: UUID (FK)│
                           │ role: organization_role   │
                           │ status: membership_status │
                           │ created_at: TIMESTAMPTZ   │
                           │ updated_at: TIMESTAMPTZ   │
                           └───────────────────────────┘
```

### Constraints & Indexes

- `unique_user_organization_membership`: `UNIQUE(user_id, organization_id)` ensures a user has at most one membership per organization.
- `idx_organization_memberships_organization_id`: Fast lookup of all members in an organization.
- `idx_organization_memberships_user_id`: Fast lookup of all organization memberships for a user.
- Foreign keys use `ON DELETE RESTRICT` to protect foundational identity and security records against accidental cascading deletion.

---

## 5. Tenant-Scoped Persistence Law

Every persistent table in WAFLOW belongs to exactly one of two categories:

1. **TENANT-SCOPED (Organization-Owned):**
   - Mandatory `organization_id UUID NOT NULL` column with a foreign key referencing `organizations(id)`.
   - Examples: `organization_memberships`, future `conversations`, `customers`, `orders`, `products`, `campaigns`.
2. **SYSTEM / GLOBAL (Unscoped):**
   - No `organization_id` column. Represents platform-level global identity or configuration.
   - Examples: `organizations` (tenant root), `users` (global actor identity).

> [!CAUTION]
> No accidental third category is permitted. Every new table must be explicitly classified.

---

## 6. Tenant-Safe Repository Queries

Every public repository operation accessing tenant-owned data must enforce tenant scoping at the database query predicate level:

```ts
// Defense-in-depth: database query is scoped by tenantContext.organizationId
const membership = await prisma.organizationMembership.findFirst({
  where: {
    id: membershipId,
    organizationId: tenantContext.organizationId,
  },
});
```

- **Information Isolation:** If a record belongs to Organization B and is queried using `TenantContext` for Organization A, the repository returns `null` (`NOT FOUND`). It never leaks whether the ID exists in another tenant.

---

## 7. Migration Discipline

- **Source of Truth:** Prisma migration files checked into source control (`packages/database/prisma/migrations/`) are immutable artifacts.
- **Production Schema Evolution:** Migrations are applied via `pnpm db:migrate:deploy` (`prisma migrate deploy`).
- **No `db push` in Production:** Schema changes must always produce reviewed, checked-in migration scripts.
- **Zero Destructive Migration in CI:** CI verifies migrations by running `pnpm db:migrate:deploy` against a clean, empty PostgreSQL service database.

---

## 8. Timestamps & Timezones

- All timestamps are stored using PostgreSQL `TIMESTAMPTZ` (UTC instants).
- Authoritative business timestamps are stored in UTC; localization (e.g., Africa/Bamako, Africa/Dakar, Africa/Abidjan, Africa/Lagos) is strictly a presentation-layer concern.

---

## 9. Row-Level Security (RLS) Status

- PostgreSQL Row-Level Security is **deliberately deferred** to a dedicated future ticket.
- Application-level and repository-level predicate scoping provide immediate, robust tenant isolation today while connection pooling and worker context semantics are formalized.

---

## 10. Local Development & Docker Workflow

### Starting the Database

```bash
# Start local PostgreSQL 17 container
docker compose up -d

# Verify container is running and healthy
docker compose ps
```

### Applying Migrations Locally

```bash
# Copy example environment contract if not present
cp .env.example .env

# Deploy migrations
pnpm db:migrate:deploy
```

### Stopping the Database

```bash
# Stop containers (preserves named volume data)
docker compose down

# To completely wipe local development database (destructive)
docker compose down -v
```
