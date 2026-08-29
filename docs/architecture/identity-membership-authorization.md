# WAFLOW Identity, Membership & Authorization Architecture

## 1. Executive Summary & Security Philosophy

WAFLOW enforces a strict, framework-independent security foundation built upon four distinct, decoupled security questions:

```text
┌─────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Security Concern        │ Question Answered                                                      │
├─────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. Authentication       │ "Who are you?" (Global User Identity)                                 │
│ 2. Membership           │ "Do you belong to this Organization, and is your account active?"      │
│ 3. Tenant Isolation     │ "Is this operation executing inside the correct Organization boundary?"│
│ 4. Authorization        │ "Are you explicitly granted the capability to perform this action?"   │
└─────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Separation of Concerns:** Authentication, Membership, Tenant Isolation, and Authorization are distinct security layers. They must **never** be collapsed into a single check or bypassed via shortcut assumptions.

---

## 2. Non-Negotiable Security Laws

1. **Deny-by-Default**: Every authorization decision is strictly denied unless an explicit, valid permission is present in the active `AuthorizationContext`.
2. **Explicit Context**: No ambient, global, or process-wide authenticated user state (e.g., `global.currentUser` or mutable singletons).
3. **Tenant-Bound Authorization**: Authorization is strictly scoped to the active `TenantContext`. A membership or permission in Organization A (_Bana Shop_) can **never** authorize operations in Organization B (_Sofia Distribution_).
4. **Role is Not Authorization**: Role strings (e.g., `OWNER`, `ADMIN`, `SALES_AGENT`) are membership metadata, not direct authorization gates. Business operations check discrete `Permission` capabilities.
5. **No Wildcard / Bypass Permissions**: Wildcards (`*`), `ALL`, or global administrator bypass mechanisms are prohibited by security policy.
6. **UI Visibility is Not Security**: Client-side menu filtering or button disabling is purely for user experience. Backend application handlers must independently authorize every operation.

---

## 3. Core Architectural Concepts

### A. User Identity (Global Scope)

A `UserId` represents a unique person or actor across the entire WAFLOW platform. User identity is system/global and is **not** owned by any single merchant organization.

### B. Organization Membership (Tenant Relation Scope)

An `OrganizationMembership` represents the relationship binding **exactly one User** to **exactly one Organization**.

- A user may possess multiple memberships across different organizations (e.g. Hamidou is `OWNER` of _Bana Shop_ and `ADMIN` of _Sofia Distribution_).
- Memberships hold an explicit lifecycle status: `ACTIVE` or `SUSPENDED`.
- Suspended memberships immediately fail all authorization checks regardless of role.

### C. Canonical Organization Roles

WAFLOW defines canonical roles aligned with the product shell:

- `OWNER` (Commercial owner and account holder within one organization)
- `ADMIN` (Organizational administrator)
- `SALES_MANAGER` (Sales team leader)
- `SALES_AGENT` (Customer-facing sales representative)
- `SUPPORT_AGENT` (Customer service specialist)
- `OPERATIONS_MANAGER` (Inventory and fulfillment manager)

> [!CAUTION]
> **Owner Semantics:** `OWNER` is the highest organizational role within **one** Organization. An `OWNER` is **not** a platform superuser, cannot access other tenants, cannot bypass database tenant filters, and cannot access resources outside their organization.

### D. Permissions & Authorization Context

- `Permission`: A strongly-typed capability string (e.g. `orders.create`, `inbox.reply`).
- `AuthorizationContext`: An immutable, frozen execution context constructed after successful identity, membership, and permission resolution. It carries `userId`, `membershipId`, `organizationId`, `role`, and an immutable `ReadonlySet<Permission>`.

---

## 4. End-to-End Conceptual Request Flow

Every inbound request or asynchronous event flows through explicit contextual stages before execution:

```text
External Inbound Request / Event
               │
               ▼
   [ 1. Authentication Layer ]           (Verifies token/credentials → resolves UserId)
               │
               ▼
 [ 2. Organization Selection ]           (User selects or request specifies Target Organization)
               │
               ▼
[ 3. Membership Resolution ]             (Verifies User belongs to Organization and status is ACTIVE)
               │
               ▼
     [ 4. TenantContext ]                (S0-04: Explicit immutable organization boundary)
               │
               ▼
 [ 5. Permission Resolution ]            (Maps Membership Role/Grants to Set<Permission>)
               │
               ▼
  [ 6. AuthorizationContext ]            (S0-05: Immutable execution context)
               │
               ▼
   [ 7. Application Operation ]          (assertPermission(ctx, 'orders.create') → Domain Logic)
               │
               ▼
 [ 8. Tenant-Scoped Persistence ]        (Database Row-Level Security & Org Isolation)
```

---

## 5. Organization Switching Invariants

When a user switches organizations in the UI (e.g., from _Bana Shop_ to _Sofia Distribution_):

1. The runtime resolves the membership corresponding to _Sofia Distribution_.
2. A new, distinct `TenantContext` and `AuthorizationContext` are instantiated.
3. Permissions from _Bana Shop_ are completely discarded from the active execution context.
4. Existing resource ownership is never modified. An order created under _Bana Shop_ remains permanently owned by _Bana Shop_.

---

## 6. Auth Provider Abstraction Principle

WAFLOW domain and application logic remain completely independent of external authentication providers (e.g., Clerk, Auth0, Firebase Auth, Supabase, Cognito, Keycloak).

External providers adapt their provider-specific tokens/claims into the canonical `UserId` at the gateway boundary. No provider SDKs or provider data types are permitted within `@waflow/domain` or `@waflow/auth`.
