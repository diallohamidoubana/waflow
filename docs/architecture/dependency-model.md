# WAFLOW Dependency Model & Boundary Rules

This document specifies the official dependency rules and package allowlists for the WAFLOW codebase.

---

## 1. Package Classification & Dependency Allowlists

### A. Core & Foundation Packages

| Package                     | Purpose                                              | Allowed `@waflow/*` Dependencies      | Forbidden Dependencies                                      |
| :-------------------------- | :--------------------------------------------------- | :------------------------------------ | :---------------------------------------------------------- |
| **`@waflow/domain`**        | Pure business entities, aggregates, and domain rules | **None (`[]`)**                       | Database, ORM, Auth, AI, Integrations, UI, Apps, Frameworks |
| **`@waflow/contracts`**     | Cross-boundary DTOs, API contracts, public types     | **None (`[]`)**                       | Database, Infrastructure, Domain internals, Apps            |
| **`@waflow/config`**        | Shared environment variables and config primitives   | **None (`[]`)**                       | All workspace packages                                      |
| **`@waflow/events`**        | Versioned event schemas and envelope definitions     | `@waflow/contracts`                   | Database, Integrations, UI, Apps                            |
| **`@waflow/observability`** | Logging, tracing, and metrics abstractions           | `@waflow/config`                      | Domain, Database, Integrations, UI                          |
| **`@waflow/security`**      | Security policies, cryptography, tenant utilities    | `@waflow/contracts`, `@waflow/config` | Database, UI, Integrations, Apps                            |

---

### B. Infrastructure & Capability Packages

| Package                    | Purpose                                                 | Allowed `@waflow/*` Dependencies                                                                                       |
| :------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **`@waflow/database`**     | Data persistence, repositories, migrations              | `@waflow/domain`, `@waflow/contracts`, `@waflow/config`, `@waflow/observability`                                       |
| **`@waflow/auth`**         | Identity, authentication & authorization adapters       | `@waflow/domain`, `@waflow/contracts`, `@waflow/security`, `@waflow/config`, `@waflow/observability`                   |
| **`@waflow/ai`**           | LLM orchestrations, prompt templates, tool definitions  | `@waflow/domain`, `@waflow/contracts`, `@waflow/security`, `@waflow/config`, `@waflow/observability`                   |
| **`@waflow/integrations`** | Third-party adapters (WhatsApp, Paystack, Twilio, etc.) | `@waflow/domain`, `@waflow/contracts`, `@waflow/events`, `@waflow/security`, `@waflow/config`, `@waflow/observability` |
| **`@waflow/analytics`**    | Metrics aggregation, business telemetry                 | `@waflow/contracts`, `@waflow/events`, `@waflow/config`, `@waflow/observability`                                       |
| **`@waflow/ui`**           | Reusable UI components & design system tokens           | `@waflow/contracts`, `@waflow/config`                                                                                  |
| **`@waflow/testing`**      | Test utilities, fixtures, and architecture verification | May import any workspace for testing; **must never be a production dependency** of any package                         |

---

### C. Application Categories

#### Composition Applications (Backend Services)

- **`apps/api`** (`@waflow/api`): Public and private API gateways.
- **`apps/workers`** (`@waflow/workers`): Asynchronous workflow and job execution.
- **`apps/webhooks`** (`@waflow/webhooks`): Inbound external webhook ingestion.

**Rules:**

- Composition applications are roots: they may compose necessary `@waflow/*` packages to construct runtime systems.
- Apps **must never** import other apps (e.g. `@waflow/api` cannot import `@waflow/workers`).

#### Presentation Applications (Frontends)

- **`apps/web`** (`@waflow/web`): Main merchant operations web console.
- **`apps/admin`** (`@waflow/admin`): Super-admin & internal backoffice portal.
- **`apps/storefront`** (`@waflow/storefront`): Customer digital storefront.

**Rules:**

- Allowed `@waflow/*` dependencies: `@waflow/ui`, `@waflow/contracts`, `@waflow/config`.
- **Forbidden dependencies**: `@waflow/database`, `@waflow/integrations`, `@waflow/ai`, `@waflow/events`, `@waflow/observability`, `@waflow/analytics`, `@waflow/security`.
- Frontends must never directly access persistence or private backend infrastructure.

---

## 2. Import Rules & Boundary Integrity

1. **Public Entry Points Only**:
   All cross-package imports must resolve to the package root (e.g. `import { Money } from '@waflow/domain'`). Deep imports (e.g. `import { Money } from '@waflow/domain/src/money.js'`) are strictly rejected.
2. **No Relative Escaping**:
   Relative imports (`../`, `../../`) must never cross workspace boundaries into neighboring packages.
3. **No Circular Dependencies**:
   The package dependency graph must remain an acyclic directed graph (DAG).
4. **Machine Enforcement**:
   Every rule documented here is machine-validated via `pnpm test:architecture` and enforced in CI pipelines.
