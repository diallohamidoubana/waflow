# ADR-0003: Organization as Canonical Tenant and Data Ownership Boundary

## Status

**Accepted**

## Context

In multi-tenant software systems, ambiguity around data ownership boundaries leads to severe security vulnerabilities, data leakage, and inconsistent product experiences. Without a single canonical tenant concept, teams frequently introduce overlapping and confusing abstractions (e.g., _Account_, _Workspace_, _Company_, _Store_, _Tenant_) where different sub-systems enforce isolation at different levels.

WAFLOW is an AI-native conversational commerce operating system serving African merchants across multiple business models, from sole proprietors to distributed retail networks. We must establish a crystal-clear, immutable tenant boundary before implementing authentication, membership, or database persistence.

## Decision

We establish **Organization** as WAFLOW's sole canonical tenant and data ownership boundary.

Key tenets:

1. **Organization = Tenant Boundary**: In customer-facing and business contexts, the boundary is called an _Organization_ (e.g., _Bana Shop_, _Sofia Distribution_, _Danaya Cargo_). In internal architectural contexts, it represents the tenant boundary.
2. **Explicit Context Only**: All tenant-scoped operations require an explicit `TenantContext`. No implicit default organization, global fallback tenant, or ambient mutable singletons are permitted.
3. **Strict Resource Scoping**: All business data (conversations, orders, customers, products, catalog items, campaigns) must implement `TenantScoped` with a non-nullable `OrganizationId`.
4. **Independent User Membership**: Users exist independently and may hold memberships in multiple organizations. Switching organizations creates a different `TenantContext` and never mutates the ownership of existing tenant-scoped resources.

## Rationale

- **Unified Mental Model**: Matches the merchant's real-world business entity and aligns directly with the product organization switcher in the UI.
- **Multi-Store & Agency Support**: Allows a single business owner, manager, or agency partner to participate in multiple organizations with complete data isolation.
- **Future-Proof Persistence**: Establishes the exact scoping column (`organization_id`) required for upcoming database Row-Level Security (RLS) policies.
- **Elimination of Semantic Drift**: Prevents overlapping terminology such as workspace/account/company from fragmenting the codebase.

## Alternatives Considered & Rejected

1. **User as Tenant**: Rejected. A business is larger than an individual user. Businesses require multiple team members with distinct roles and collaboration on shared orders and customer conversations.
2. **Channel / WhatsApp Phone Number as Tenant**: Rejected. A single merchant organization may operate multiple WhatsApp numbers, web storefronts, and social commerce channels.
3. **Global Unscoped Business Data**: Rejected. Violates WAFLOW Constitution Law WFL-004.
4. **Dual Overlapping Boundaries (e.g., Organization + Workspace)**: Rejected. Multiple overlapping isolation tiers create confusion regarding which layer owns database rows and permissions.

## Consequences

### Positive

- **Deterministic Isolation**: Compile-time and runtime validation prevents cross-tenant access.
- **Clean Architecture**: `@waflow/domain` provides pure, infrastructure-independent tenancy primitives before database implementation.
- **Consistent Developer Experience**: Every domain model and application handler follows an identical pattern for tenant awareness.

### Negative / Trade-offs

- Every tenant-scoped operation must explicitly accept or resolve `TenantContext`, preventing shortcut access patterns.
