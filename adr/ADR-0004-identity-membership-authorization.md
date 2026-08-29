# ADR-0004: Decoupled Identity, Membership, and Permission-Based Authorization

## Status

**Accepted**

## Context

In multi-tenant commercial platforms, authorization systems frequently suffer from severe structural defects when identity, tenancy, and permissions are conflated:

1. **Role-String Scattering**: Hardcoding `if (role === 'ADMIN')` across service handlers makes role evolution, custom permissions, and principle-of-least-privilege impossible to maintain.
2. **Ambient State**: Storing the current user in global or thread-local singletons creates race conditions, security bypasses in async background tasks, and tenant leakage.
3. **Superuser Anti-Patterns**: Granting platform-wide bypasses to organizational `OWNER` roles compromises cross-tenant isolation and security compliance.
4. **Provider Lock-In**: Direct coupling between domain models and third-party authentication SDKs prevents identity provider migrations and complicates local testing.

## Decision

We establish a **four-tier, decoupled security model**:

1. **Decoupled Primitives**:
   - **Identity (`UserId`)**: Platform-wide global actor identity.
   - **Membership (`OrganizationMembership`)**: Tenant-specific relation binding 1 user to 1 organization with role and lifecycle status (`ACTIVE` / `SUSPENDED`).
   - **Tenant Boundary (`TenantContext`)**: Explicit organization execution boundary.
   - **Authorization (`AuthorizationContext`)**: Deny-by-default execution context containing an immutable set of granted `Permission` capabilities.
2. **Permission-Based Evaluation**: Application handlers authorize discrete capabilities (e.g. `assertPermission(ctx, 'orders.create')`) rather than querying role strings directly.
3. **Strict Deny-by-Default**: Incomplete context, missing permissions, suspended memberships, or tenant mismatches immediately deny access with stable machine-readable reasons.
4. **Provider-Agnostic Core**: `@waflow/domain` and `@waflow/auth` contain zero third-party authentication infrastructure or provider SDKs.

## Rationale

- **Extensibility**: Permits future role-to-permission policy updates, granular enterprise permissions, and dynamic delegation without refactoring application logic.
- **Tenant Integrity**: Guarantees that organizational roles (including `OWNER`) are strictly contained within their respective tenant boundary.
- **Auditability & Traceability**: Explicit contexts passed through application boundaries provide deterministic audit trails for compliance.

## Alternatives Considered & Rejected

1. **Role-Only Authorization**: Rejected. Scattering role checks across domain code creates rigid coupling and prevents fine-grained permission assignment.
2. **User as Tenant**: Rejected in ADR-0003; reaffirmed here.
3. **UI Visibility as Security**: Rejected. Presentation-tier visibility rules are purely UX aids; backend must enforce independent permission gates.
4. **Global Current User Singleton**: Rejected. Ambient mutable state causes cross-tenant leakage in concurrent and asynchronous workloads.
5. **OWNER as System Superuser**: Rejected. `OWNER` authority is strictly bounded by its organization identifier.

## Consequences

### Positive

- **Deterministic Security**: Invariant enforcement at compile time and runtime prevents privilege escalation and cross-tenant leakage.
- **Clean Architecture**: `@waflow/auth` depends cleanly on `@waflow/domain` without framework or transport dependencies.
- **Multi-Store Support**: Seamlessly accommodates users with multiple memberships across different organizations.

### Negative / Trade-offs

- Every authorized operation requires explicit permission resolution and context passing.
