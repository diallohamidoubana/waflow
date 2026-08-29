# WAFLOW Multi-Tenancy Architecture

## 1. Executive Summary & Core Law

> **WAFLOW Constitution Law (WFL-004):**  
> _All tenant-owned business data must be tenant scoped._

In WAFLOW, the **Organization** is the customer-facing and architectural tenant boundary. Every merchant business (e.g., _Bana Shop_, _Sofia Distribution_, _Danaya Cargo_) operates as an independent Organization.

This document establishes the canonical multi-tenant model and isolation primitives governing all layers of the WAFLOW Operating System.

---

## 2. Canonical Terminology

| Term              | Context                 | Definition                                                                                                     |
| :---------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Organization**  | Product / UI / Business | The customer-facing merchant entity and commercial unit.                                                       |
| **Tenant**        | Internal Architecture   | The data isolation boundary representing an Organization in technical contexts.                                |
| **TenantContext** | Execution Scope         | The explicit, immutable execution context defining which Organization boundary an operation is running inside. |
| **TenantScoped**  | Domain Contract         | A marker invariant interface indicating that a resource is strictly owned by an Organization.                  |

> [!IMPORTANT]
> **No Overlapping Boundaries:** Organization is the single, canonical ownership and isolation boundary. Concepts such as "Workspace" or "Account" must **never** be introduced as competing or overlapping data-isolation boundaries.

---

## 3. Data Classification: Tenant-Scoped vs. System/Global

Every persistent business concept introduced into WAFLOW must be intentionally and explicitly classified into one of two mutually exclusive categories:

### A. Tenant-Scoped Data (The Default for Business Concepts)

Must implement `TenantScoped` with a non-nullable `organizationId`:

- Conversations & Messages
- Customers & Contacts
- Orders, Invoices & Line Items
- Products & Catalogs
- Marketing Campaigns
- Automation Workflows & Flow Instances
- Payment & Delivery Records
- Integrations & Channel Configurations

### B. System / Global Data (Explicitly Platform-Wide)

Global platform primitives that exist independently of any merchant organization:

- Country & Geographical Metadata
- Currency Codes & Reference Rates
- Platform System Configuration
- Global System Audit Logs

> [!CAUTION]
> **Zero Unscoped Data:** There is no accidental "unscoped" third category. Any business data lacking an `organizationId` is an architectural defect.

---

## 4. Invariant Rules of Tenant Isolation

1. **No Implicit Default Tenant**: The system will never guess, fall back to, or silently substitute a default organization. Operations missing tenant context must fail immediately.
2. **No Nullable Organization Identifiers**: Resources defined as `TenantScoped` must have a non-nullable, strongly-typed `OrganizationId`.
3. **No Ambient Global State**: `TenantContext` must be passed explicitly across application boundaries. Patterns such as `global.currentTenant`, `static TenantContext.current`, or mutable singletons are strictly forbidden.
4. **Cross-Tenant Isolation**: Cross-organization data access is forbidden. Any cross-tenant operation without an explicitly designed system-level workflow throws a `TenantBoundaryViolationError`.
5. **Ownership Immutability on Switch**: When a user switches active organizations in the UI (e.g. from _Bana Shop_ to _Sofia Distribution_), the runtime selects a **different** `TenantContext`. Switching context never mutates the ownership of existing tenant-scoped resources.

---

## 5. Application Boundary Request Flow

Every inbound request or asynchronous event flows through explicit contextual stages before persistence:

```text
External Request / Inbound Event
               │
               ▼
   [ Authentication Layer ]           (S0-05: Verifies User / Client Identity)
               │
               ▼
[ Organization Membership Resolution ] (S0-05: Confirms User has Active Access to Target Org)
               │
               ▼
       [ TenantContext ]              (S0-04: Explicit immutable organization boundary)
               │
               ▼
    [ Application Operation ]         (Domain logic executes inside explicit TenantContext)
               │
               ▼
  [ Tenant-Scoped Persistence ]       (Future DB: Row-Level Security & Tenant Filtering)
```

---

## 6. Implementation Roadmap

- **WFL-S0-04 (Current)**: Pure domain tenancy primitives (`OrganizationId`, `TenantContext`, `TenantScoped`, isolation guards, error types). Zero infrastructure dependencies.
- **WFL-S0-05 (Upcoming)**: Authentication, User Identity, Organization Membership, and Role-Based Access Control (RBAC).
- **Future Database Tickets**: Schema definitions, foreign keys, Row-Level Security (RLS) policies, and query interceptors.
