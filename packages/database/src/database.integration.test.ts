import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenantContext, isMembershipId, isOrganizationId, isUserId } from '@waflow/domain';
import {
  checkDatabaseHealth,
  createMembershipRepository,
  createOrganizationRepository,
  createUserRepository,
  disconnectDatabaseClient,
  DuplicateMembershipError,
  mapDatabaseMembership,
} from './index.js';
import { getDatabaseClient } from './client/index.js';

describe('Database & Persistence Foundation — Real PostgreSQL Integration', () => {
  let isDatabaseAvailable = false;
  const client = getDatabaseClient();
  const orgRepo = createOrganizationRepository(client);
  const userRepo = createUserRepository(client);
  const membershipRepo = createMembershipRepository(client);

  beforeAll(async () => {
    const health = await checkDatabaseHealth(client);
    isDatabaseAvailable = health.isHealthy;
  });

  afterAll(async () => {
    if (isDatabaseAvailable) {
      await disconnectDatabaseClient();
    }
  });

  it('Scenario 0: Database health check operation returns valid connectivity state', async () => {
    const health = await checkDatabaseHealth(client);
    expect(typeof health.isHealthy).toBe('boolean');
    if (health.isHealthy) {
      expect(typeof health.latencyMs).toBe('number');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    } else {
      expect(typeof health.error).toBe('string');
    }
  });

  it('Scenario 1: Foundational Insert & Domain Mapping — persists organizations, users, and memberships', async () => {
    if (!isDatabaseAvailable) return;

    // Create 2 organizations
    const orgA = await orgRepo.create();
    const orgB = await orgRepo.create();
    expect(isOrganizationId(orgA.id)).toBe(true);
    expect(isOrganizationId(orgB.id)).toBe(true);

    // Create 2 users
    const userA = await userRepo.create();
    const userB = await userRepo.create();
    expect(isUserId(userA.id)).toBe(true);
    expect(isUserId(userB.id)).toBe(true);

    // Create TenantContexts
    const tenantCtxA = createTenantContext(orgA.id);
    const tenantCtxB = createTenantContext(orgB.id);

    // Create Membership A (User A -> Org A)
    const memA = await membershipRepo.createMembership(tenantCtxA, {
      userId: userA.id,
      role: 'OWNER',
      status: 'ACTIVE',
    });

    // Create Membership B (User B -> Org B)
    const memB = await membershipRepo.createMembership(tenantCtxB, {
      userId: userB.id,
      role: 'SALES_AGENT',
      status: 'ACTIVE',
    });

    expect(isMembershipId(memA.membershipId)).toBe(true);
    expect(isMembershipId(memB.membershipId)).toBe(true);
    expect(memA.organizationId).toBe(orgA.id);
    expect(memA.userId).toBe(userA.id);
    expect(memA.role).toBe('OWNER');
    expect(memB.organizationId).toBe(orgB.id);
    expect(memB.userId).toBe(userB.id);
    expect(memB.role).toBe('SALES_AGENT');
  });

  it('Scenario 2: Unique Membership Constraint — database rejects duplicate membership for user + org', async () => {
    if (!isDatabaseAvailable) return;

    const org = await orgRepo.create();
    const user = await userRepo.create();
    const tenantCtx = createTenantContext(org.id);

    // First membership creation succeeds
    await membershipRepo.createMembership(tenantCtx, {
      userId: user.id,
      role: 'ADMIN',
    });

    // Duplicate membership creation must fail with DuplicateMembershipError
    await expect(
      membershipRepo.createMembership(tenantCtx, {
        userId: user.id,
        role: 'SALES_MANAGER',
      }),
    ).rejects.toThrow(DuplicateMembershipError);
  });

  it('Scenario 3: Tenant Scoped Lookup — query predicate prevents cross-tenant data leakage', async () => {
    if (!isDatabaseAvailable) return;

    const orgA = await orgRepo.create();
    const orgB = await orgRepo.create();
    const userB = await userRepo.create();

    const tenantCtxA = createTenantContext(orgA.id);
    const tenantCtxB = createTenantContext(orgB.id);

    // Create Membership B in Org B
    const memB = await membershipRepo.createMembership(tenantCtxB, {
      userId: userB.id,
      role: 'SALES_AGENT',
    });

    // Lookup Membership B with TenantContext A -> must return null (not found in Tenant A)
    const crossTenantLookup = await membershipRepo.findMembershipById(
      tenantCtxA,
      memB.membershipId,
    );
    expect(crossTenantLookup).toBeNull();

    // Lookup Membership B with TenantContext B -> returns Membership B
    const validTenantLookup = await membershipRepo.findMembershipById(
      tenantCtxB,
      memB.membershipId,
    );
    expect(validTenantLookup).not.toBeNull();
    expect(validTenantLookup?.membershipId).toBe(memB.membershipId);
    expect(validTenantLookup?.organizationId).toBe(orgB.id);

    // User lookup in wrong tenant -> returns null
    const userInWrongTenant = await membershipRepo.findMembershipForUser(tenantCtxA, userB.id);
    expect(userInWrongTenant).toBeNull();

    // User lookup in correct tenant -> returns membership
    const userInCorrectTenant = await membershipRepo.findMembershipForUser(tenantCtxB, userB.id);
    expect(userInCorrectTenant).not.toBeNull();
    expect(userInCorrectTenant?.userId).toBe(userB.id);
  });

  it('Scenario 4: User Multi-Org Membership — one user can belong to multiple organizations', async () => {
    if (!isDatabaseAvailable) return;

    const orgA = await orgRepo.create();
    const orgB = await orgRepo.create();
    const multiOrgUser = await userRepo.create();

    const tenantCtxA = createTenantContext(orgA.id);
    const tenantCtxB = createTenantContext(orgB.id);

    // User belongs to Org A as OWNER
    const memA = await membershipRepo.createMembership(tenantCtxA, {
      userId: multiOrgUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    });

    // User also belongs to Org B as SALES_AGENT
    const memB = await membershipRepo.createMembership(tenantCtxB, {
      userId: multiOrgUser.id,
      role: 'SALES_AGENT',
      status: 'ACTIVE',
    });

    expect(memA.userId).toBe(multiOrgUser.id);
    expect(memA.organizationId).toBe(orgA.id);
    expect(memB.userId).toBe(multiOrgUser.id);
    expect(memB.organizationId).toBe(orgB.id);
    expect(memA.membershipId).not.toBe(memB.membershipId);
  });

  it('Scenario 5: Domain Mapping & Runtime Enum Safety — validates all fields via domain factories', () => {
    const rawRecord = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      organizationId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      role: 'SUPPORT_AGENT' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const domainMem = mapDatabaseMembership(rawRecord);

    expect(isMembershipId(domainMem.membershipId)).toBe(true);
    expect(isUserId(domainMem.userId)).toBe(true);
    expect(isOrganizationId(domainMem.organizationId)).toBe(true);
    expect(domainMem.role).toBe('SUPPORT_AGENT');
    expect(domainMem.status).toBe('ACTIVE');
    expect(Object.isFrozen(domainMem)).toBe(true);
  });

  it('Scenario 6: Persistence Error Hierarchy — typed error mapping and cause propagation', () => {
    const duplicateErr = new DuplicateMembershipError(
      'usr_123',
      'org_456',
      new Error('Unique constraint failed'),
    );
    expect(duplicateErr.name).toBe('DuplicateMembershipError');
    expect(duplicateErr.userId).toBe('usr_123');
    expect(duplicateErr.organizationId).toBe('org_456');
    expect(duplicateErr.message).toContain('Membership already exists');
    expect(duplicateErr.cause).toBeDefined();
  });
});
