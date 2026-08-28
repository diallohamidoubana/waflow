# WAFLOW System Architecture

## 1. Architectural Style: Modular Monolith + Internal Events

WAFLOW is engineered as a **Modular Monolith** with an **Internal Event-Driven Architecture**.

```text
       Presentation / Frontends (apps/web, apps/admin, apps/storefront)
                                   ↓
       Application Composition (apps/api, apps/workers, apps/webhooks)
                                   ↓
                     Domain & Contracts Layer
          (@waflow/domain, @waflow/contracts, @waflow/events)
                                   ↑
                        Infrastructure Adapters
  (@waflow/database, @waflow/integrations, @waflow/ai, @waflow/auth, ...)
```

### Why Modular Monolith?

1. **Low Operational Overhead**: A single cohesive deployment pipeline while maintaining clear boundaries.
2. **Transactional Simplicity & Consistency**: Critical business transactions (e.g. inventory allocation, order creation) can execute with strong consistency without distributed transaction overhead.
3. **High Developer Velocity**: Shared static typing, atomic cross-package refactoring, and deterministic local verification.
4. **Extractable by Design**: Domain modules interact via strict public contracts and events. Any module can be extracted into an independent microservice in the future if warranted by scaling or isolation signals without rewriting core logic.

---

## 2. Core Architectural Principles

- **A1**: Business/domain logic must not depend on frameworks.
- **A2**: The domain layer must not import infrastructure implementations.
- **A3**: Applications may compose packages. Packages must never depend on applications.
- **A4**: Applications must never import other applications.
- **A5**: Infrastructure may depend inward toward domain abstractions; core logic must never depend outward toward infrastructure.
- **A6**: External providers must be accessed exclusively through WAFLOW-owned adapters and contracts.
- **A7**: No external SDK (Meta, WhatsApp, OpenAI, Stripe, Paystack, Prisma, Express/Fastify) may be a domain dependency.
- **A8**: Cross-package imports must use public package entry points (`@waflow/domain`). Deep imports (`@waflow/domain/src/foo`) and relative boundary escapes are forbidden.
- **A9**: Circular dependencies between packages are forbidden.
- **A10**: Frontend applications must not directly access backend infrastructure packages (e.g. `@waflow/database`, `@waflow/integrations`).
- **A11**: Architecture rules are executable and verified in CI.
- **A12**: Architecture tests fail loudly with actionable diagnostics upon rule violation.

---

## 3. Dependency Inversion

In WAFLOW, high-level business policies do not depend on low-level technical mechanisms:

- Domain modules define entity rules and port interfaces.
- Infrastructure packages implement these interfaces as adapters.
- Application composition roots wire adapters to domain services at runtime.

This design guarantees that databases, AI providers, message brokers, and third-party APIs can be substituted or upgraded with zero impact on core domain business rules.
