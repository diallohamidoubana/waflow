# WAFLOW Constitution

**Version:** 1.0.0  
**Status:** ACTIVE  
**Last Updated:** 2026-08-28

> _"The customer speaks. WAFLOW understands. WAFLOW acts. The business learns."_

---

## Preamble

This Constitution establishes the foundational, non-negotiable architectural and product laws governing the WAFLOW Operating System. Every module, service, automated agent, and engineering contribution must strictly adhere to these principles.

---

## Fundamental Laws

### WFL-001: Conversation to Structured Data

Conversation must be transformable into structured business data. Unstructured customer communication is the primary input; deterministic, typed business records are the required output.

### WFL-002: Non-Authoritative AI Facts

AI must never invent authoritative business facts such as stock levels, pricing, payment statuses, or user permissions. Authoritative state resides exclusively within domain databases and verified business rules.

### WFL-003: Policy Evaluation for Sensitive Actions

Sensitive actions (financial transactions, credential changes, data exports, order cancellations) require explicit, deterministic policy evaluation before execution.

### WFL-004: Strict Tenant Isolation

All tenant-owned business data must be tenant scoped. Cross-tenant data leakage is a critical system violation; all persistence, querying, and event streams must enforce strict tenant boundaries.

### WFL-005: Auditability of Critical Mutations

Critical state mutations across the system must be auditable, capturing timestamp, actor/agent identity, tenant context, previous state, and mutation payload.

### WFL-006: External Provider Isolation

External providers (messaging gateways, payment aggregators, LLM providers, logistics APIs) must remain behind WAFLOW-owned boundaries and adapters. Direct external dependencies in core domain logic are strictly forbidden.

### WFL-007: Human-in-the-Loop for High-Risk Actions

High-risk agent actions require human approval or explicit policy authorization. Autonomous execution is bounded by configurable risk tiers.

### WFL-008: Versioned Contracts & Events

Public contracts, APIs, and domain events must be versionable to ensure backward compatibility and reliable independent system evolution.

### WFL-009: Pervasive Observability

Important production behavior (operational metrics, business funnels, latency, error budgets, agent token usage) must be observable through centralized telemetry and tracing.

### WFL-010: Mandatory Validation Gates

No implementation ticket is complete without its required validation gates. Code without automated tests, type verification, linting, and architecture compliance will not be accepted.

### WFL-011: Mobile-First Experience

WAFLOW is mobile-first. Merchant interfaces and customer touchpoints must be optimized for mobile screens, touch interactions, and mobile operating environments.

### WFL-012: Bandwidth Efficiency

WAFLOW must remain performant and usable under constrained bandwidth, intermittent connectivity, and high-latency mobile network conditions.

### WFL-013: Voice as a First-Class Modality

Voice is a first-class interaction modality alongside text. System architecture must support audio transcription, voice notes, and speech-driven commerce workflows natively.

### WFL-014: AI Output as Proposals

AI output is a proposal unless domain rules and policies explicitly validate and make it authoritative. AI suggests; domain logic verifies and commits.

### WFL-015: North Star Metric Alignment

Conversation-to-Paid-Order Rate is the initial North Star Metric of WAFLOW. System performance, UX decisions, and agent workflows must optimize toward completing successful, verified commercial transactions from conversations.

---

## Amendment Rule

These constitutional laws represent the core invariant foundation of WAFLOW.

Modifications, additions, or revocations of any constitutional law require an explicit, approved **Request For Comments (RFC)** and **Architecture Decision Record (ADR)**. Silent, unreviewed, or ad-hoc modifications are strictly prohibited.
