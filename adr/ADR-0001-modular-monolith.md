# ADR-0001: Modular Monolith with Internal Event-Driven Boundaries

## Status

**Accepted**

## Context

WAFLOW is building an AI-native conversational commerce operating system. In the early stages of product development, the problem space evolves rapidly, domain boundaries are frequently refined, and developer velocity is paramount. Starting with a distributed microservices architecture introduces high operational complexity, distributed data consistency challenges, network latency, and deployment orchestration overhead before business product-market fit is established.

## Decision

We will build WAFLOW as a **Modular Monolith** with an **Internal Event-Driven Architecture**.

Key aspects:

1. **Isolated Packages**: Domain and capability modules are packaged within a monorepo with explicit, strictly enforced boundaries.
2. **Synchronous In-Process Composition**: Apps compose packages directly in-process for low latency and transactional simplicity.
3. **Asynchronous Internal Events**: Cross-domain side-effects (e.g. notification dispatch, analytics ingestion, webhook emission) are decoupled via typed event contracts.
4. **Shared Database / Schema Isolation**: Persistence layers maintain logical schema isolation per domain to prevent cross-domain database coupling.

## Consequences

### Positive

- **High Engineering Velocity**: Atomic refactoring, end-to-end type safety, and fast local development.
- **Transactional Consistency**: Critical transactions (e.g., checkout, stock decrement) can run with atomic transactional guarantees without two-phase commit overhead.
- **Zero Microservice Tax**: No distributed tracing overhead, RPC latency, service mesh complexity, or multi-repo synchronization friction.
- **Extractable Architecture**: Because domain modules interact solely through contracts and events, any module can be extracted into an independent microservice in the future.

### Negative / Trade-offs

- Requires strict automated discipline to prevent accidental coupling and architectural erosion.

## Extraction Signals

We will consider extracting a modular component into an independent microservice only when one or more of the following concrete signals are met:

1. **Disproportionate Scaling**: A workload has unique compute, memory, or throughput characteristics that cannot be efficiently scaled alongside the monolith (e.g. real-time audio streaming or heavy batch background compute).
2. **Team Ownership Boundaries**: Multiple autonomous engineering teams require fully independent release lifecycles.
3. **Security & Isolation Constraints**: A component requires specialized compliance or hardware isolation (e.g. PCI-DSS payment vaults, confidential compute).
4. **Reliability & Blast Radius Isolation**: A component has volatile failure modes that must not risk impacting core checkout or API gateway uptime.
5. **Demonstrated Deployment Independence**: Measurable business value achieved by decoupling deployment frequency.
