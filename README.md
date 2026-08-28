# WAFLOW

**AI-Native Conversational Commerce Operating System for Africa.**

> _"The customer speaks. WAFLOW understands. WAFLOW acts. The business learns."_

---

## 1. Project Status

This repository is currently at the **bootstrap stage (Ticket WFL-S0-01)**.

> [!NOTE]
> Product and domain implementation has **not** started yet. This repository only contains the production-grade monorepo foundation, workspace layout, shared TypeScript compiler profiles, linting, formatting, and build pipelines.

---

## 2. Monorepo Structure

The repository is organized as a Turborepo + pnpm monorepo:

```text
waflow/
├── apps/
│   ├── admin/         # Internal merchant and operations administration console
│   ├── api/           # Core WAFLOW REST / RPC API gateway
│   ├── storefront/    # Merchant customer-facing digital storefront
│   ├── web/           # Main WAFLOW merchant web application
│   ├── webhooks/      # Inbound webhook ingestion service
│   └── workers/       # Asynchronous background job and workflow workers
│
├── packages/
│   ├── ai/            # Conversational intelligence & LLM integration layer
│   ├── analytics/     # Business analytics, telemetry, and event metrics
│   ├── auth/          # Authentication & authorization abstractions
│   ├── config/        # Centralized environment and runtime configuration
│   ├── contracts/     # Cross-service API and payload contracts
│   ├── database/      # Data access layer and persistence abstractions
│   ├── domain/        # Pure business entities and domain logic
│   ├── events/        # Event schemas and event broker abstractions
│   ├── integrations/  # Third-party service integrations
│   ├── observability/ # Logging, tracing, and metrics instrumentation
│   ├── security/      # Cryptography, tenant isolation, and security utilities
│   ├── testing/       # Shared test utilities and test harness
│   └── ui/            # Reusable UI components and design tokens
│
├── docs/              # Architectural and system documentation
├── adr/               # Architecture Decision Records
├── rfcs/              # Request For Comments (RFCs)
└── tickets/           # Sprint and roadmap ticket tracking
```

---

## 3. Requirements

- **Node.js**: LTS (v20.x or v22.x recommended)
- **pnpm**: `>= 9.0.0`
- **OS**: Windows, macOS, or Linux

---

## 4. Getting Started

### Installation

Install all monorepo dependencies:

```bash
pnpm install
```

---

## 5. Development Commands

The root workspace exposes the following standard lifecycle commands:

| Command             | Description                                                 |
| :------------------ | :---------------------------------------------------------- |
| `pnpm build`        | Compiles all workspace packages and apps via Turborepo      |
| `pnpm typecheck`    | Runs strict TypeScript typechecks across all workspaces     |
| `pnpm lint`         | Runs ESLint across all workspaces                           |
| `pnpm format`       | Formats the codebase using Prettier                         |
| `pnpm format:check` | Verifies code formatting compliance                         |
| `pnpm test`         | Runs the Vitest test suite                                  |
| `pnpm clean`        | Cleans build artifacts (`dist/`), TS build info, and caches |
