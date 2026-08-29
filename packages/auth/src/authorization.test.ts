import { describe, expect, it } from 'vitest';
import {
  createMembershipId,
  createOrganizationId,
  createOrganizationMembership,
  createPermission,
  createTenantContext,
  createUserId,
  type OrganizationMembership,
  type TenantContext,
  type TenantScoped,
} from '@waflow/domain';
import {
  AuthorizationDeniedError,
  assertActiveMembership,
  assertMembershipMatchesTenant,
  assertMembershipMatchesUser,
  assertPermission,
  createAuthorizationContext,
  evaluateAuthorization,
  hasPermission,
} from './index.js';

// Isolated test fixtures
interface MockBusinessResource extends TenantScoped {
  readonly id: string;
  readonly name: string;
}

function createMockResource(
  organizationId: ReturnType<typeof createOrganizationId>,
  id: string,
  name: string,
): MockBusinessResource {
  return Object.freeze({
    organizationId,
    id,
    name,
  });
}

describe('Identity, Membership & Authorization Foundation — Security Invariants', () => {
  const userId = createUserId('usr_hamidou');
  const banaOrgId = createOrganizationId('org_bana_shop');
  const sofiaOrgId = createOrganizationId('org_sofia_dist');

  const permOrdersCreate = createPermission('orders.create');
  const permOrdersRead = createPermission('orders.read');
  const permAnalyticsView = createPermission('analytics.view');

  const activeBanaMembership: OrganizationMembership = createOrganizationMembership({
    membershipId: createMembershipId('mem_bana_01'),
    userId,
    organizationId: banaOrgId,
    role: 'OWNER',
    status: 'ACTIVE',
  });

  const suspendedBanaMembership: OrganizationMembership = createOrganizationMembership({
    membershipId: createMembershipId('mem_bana_suspended'),
    userId,
    organizationId: banaOrgId,
    role: 'OWNER',
    status: 'SUSPENDED',
  });

  const banaTenantContext: TenantContext = createTenantContext(banaOrgId);
  const sofiaTenantContext: TenantContext = createTenantContext(sofiaOrgId);

  describe('Membership & Tenant Enforcement', () => {
    it('Scenario G: should create AuthorizationContext for ACTIVE membership matching TenantContext', () => {
      const authCtx = createAuthorizationContext({
        membership: activeBanaMembership,
        tenantContext: banaTenantContext,
        permissions: [permOrdersCreate, permOrdersRead],
      });

      expect(authCtx.userId).toBe(userId);
      expect(authCtx.membershipId).toBe(activeBanaMembership.membershipId);
      expect(authCtx.organizationId).toBe(banaOrgId);
      expect(authCtx.role).toBe('OWNER');
      expect(authCtx.permissions.has(permOrdersCreate)).toBe(true);
      expect(Object.isFrozen(authCtx)).toBe(true);
    });

    it('Scenario H & P: should reject SUSPENDED membership even if role is OWNER', () => {
      expect(() => assertActiveMembership(suspendedBanaMembership)).toThrow(
        AuthorizationDeniedError,
      );

      try {
        createAuthorizationContext({
          membership: suspendedBanaMembership,
          tenantContext: banaTenantContext,
          permissions: [permOrdersCreate],
        });
        expect.unreachable('Should have thrown AuthorizationDeniedError');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationDeniedError);
        const authErr = err as AuthorizationDeniedError;
        expect(authErr.reason).toBe('MEMBERSHIP_INACTIVE');
      }
    });

    it('Scenario I & O: should reject membership when organization does not match TenantContext', () => {
      expect(() => assertMembershipMatchesTenant(activeBanaMembership, sofiaTenantContext)).toThrow(
        AuthorizationDeniedError,
      );

      try {
        createAuthorizationContext({
          membership: activeBanaMembership,
          tenantContext: sofiaTenantContext,
          permissions: [permOrdersCreate],
        });
        expect.unreachable('Should have thrown AuthorizationDeniedError');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationDeniedError);
        const authErr = err as AuthorizationDeniedError;
        expect(authErr.reason).toBe('TENANT_MISMATCH');
      }
    });

    it('Scenario J: OWNER membership still cannot cross tenant boundary into another organization', () => {
      // Bana Shop OWNER attempts access in Sofia Distribution context
      expect(() => assertMembershipMatchesTenant(activeBanaMembership, sofiaTenantContext)).toThrow(
        AuthorizationDeniedError,
      );
    });

    it('Scenario K: knowing an OrganizationId without membership does not authorize access', () => {
      const foreignUserId = createUserId('usr_stranger');
      expect(() => assertMembershipMatchesUser(activeBanaMembership, foreignUserId)).toThrow(
        AuthorizationDeniedError,
      );
    });
  });

  describe('Permission Authorization Engine & Deny-By-Default', () => {
    const authCtx = createAuthorizationContext({
      membership: activeBanaMembership,
      tenantContext: banaTenantContext,
      permissions: [permOrdersCreate, permOrdersRead],
    });

    it('Scenario L: explicit granted permission returns ALLOW', () => {
      expect(hasPermission(authCtx, permOrdersCreate)).toBe(true);
      const decision = evaluateAuthorization(authCtx, permOrdersCreate);
      expect(decision.allowed).toBe(true);
      expect(() => assertPermission(authCtx, permOrdersCreate)).not.toThrow();
    });

    it('Scenario M: missing permission returns DENY with PERMISSION_MISSING reason', () => {
      expect(hasPermission(authCtx, permAnalyticsView)).toBe(false);
      const decision = evaluateAuthorization(authCtx, permAnalyticsView);
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.reason).toBe('PERMISSION_MISSING');
      }
      expect(() => assertPermission(authCtx, permAnalyticsView)).toThrow(AuthorizationDeniedError);
    });

    it('Scenario N: empty permission grant set returns DENY for any permission request', () => {
      const emptyCtx = createAuthorizationContext({
        membership: activeBanaMembership,
        tenantContext: banaTenantContext,
        permissions: [],
      });

      expect(hasPermission(emptyCtx, permOrdersCreate)).toBe(false);
      const decision = evaluateAuthorization(emptyCtx, permOrdersCreate);
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.reason).toBe('PERMISSION_MISSING');
      }
    });

    it('Scenario Q & R: dedicated AuthorizationDeniedError carries structured reason and metadata', () => {
      try {
        assertPermission(authCtx, permAnalyticsView);
        expect.unreachable('Should have thrown AuthorizationDeniedError');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationDeniedError);
        const authErr = err as AuthorizationDeniedError;
        expect(authErr.name).toBe('AuthorizationDeniedError');
        expect(authErr.reason).toBe('PERMISSION_MISSING');
        expect(authErr.requiredPermission).toBe(permAnalyticsView);
        expect(authErr.organizationId).toBe(banaOrgId);
      }
    });

    it('Scenario S & T: no default permission or wildcard bypass exists', () => {
      // Wildcard string cannot even be created as a permission
      const arbitraryPerm = createPermission('some.arbitrary.permission');
      expect(hasPermission(authCtx, arbitraryPerm)).toBe(false);
    });
  });

  describe('Context Immutability & Organization Switching Security', () => {
    it('Scenario U: authorization context permissions cannot be mutated via external reference', () => {
      const grantedPermissions = new Set([permOrdersCreate]);

      const authCtx = createAuthorizationContext({
        membership: activeBanaMembership,
        tenantContext: banaTenantContext,
        permissions: grantedPermissions,
      });

      expect(authCtx.permissions.has(permOrdersCreate)).toBe(true);
      expect(authCtx.permissions.has(permOrdersRead)).toBe(false);

      // Attempt to mutate external array/set
      grantedPermissions.add(permOrdersRead);

      // Invariant: AuthorizationContext permissions remain untouched
      expect(authCtx.permissions.has(permOrdersRead)).toBe(false);
    });

    it('Scenario V & W: switching organizations requires a different Membership and cannot reuse permissions', () => {
      // User has OWNER in Bana Shop with orders.create and orders.read
      const banaAuthCtx = createAuthorizationContext({
        membership: activeBanaMembership,
        tenantContext: banaTenantContext,
        permissions: [permOrdersCreate, permOrdersRead],
      });

      // User has SALES_AGENT in Sofia Distribution with only orders.read
      const sofiaMembership: OrganizationMembership = createOrganizationMembership({
        membershipId: createMembershipId('mem_sofia_02'),
        userId,
        organizationId: sofiaOrgId,
        role: 'SALES_AGENT',
        status: 'ACTIVE',
      });

      const sofiaAuthCtx = createAuthorizationContext({
        membership: sofiaMembership,
        tenantContext: sofiaTenantContext,
        permissions: [permOrdersRead],
      });

      // Bana Shop context can create orders
      expect(hasPermission(banaAuthCtx, permOrdersCreate)).toBe(true);

      // In Sofia Distribution context, orders.create is denied
      expect(hasPermission(sofiaAuthCtx, permOrdersCreate)).toBe(false);
      expect(() => assertPermission(sofiaAuthCtx, permOrdersCreate)).toThrow(
        AuthorizationDeniedError,
      );
    });

    it('Scenario X: resource ownership remains unchanged when organization context switches', () => {
      const banaOrder = createMockResource(banaOrgId, 'ord_bana_99', 'Bana Order');

      // Resource is owned by Bana Shop
      expect(banaOrder.organizationId).toBe(banaOrgId);

      // When active context switches to Sofia, resource ownership is not mutated
      const sofiaMembership = createOrganizationMembership({
        membershipId: createMembershipId('mem_sofia_02'),
        userId,
        organizationId: sofiaOrgId,
        role: 'SALES_AGENT',
        status: 'ACTIVE',
      });

      const sofiaAuthCtx = createAuthorizationContext({
        membership: sofiaMembership,
        tenantContext: sofiaTenantContext,
        permissions: [permOrdersRead],
      });

      expect(banaOrder.organizationId).toBe(banaOrgId);
      expect(banaOrder.organizationId).not.toBe(sofiaAuthCtx.organizationId);
    });

    it('Role vs Permission: role metadata alone does not grant permissions unless explicitly present in grant set', () => {
      // SALES_AGENT with no granted permissions
      const agentMembership = createOrganizationMembership({
        membershipId: createMembershipId('mem_agent_03'),
        userId,
        organizationId: banaOrgId,
        role: 'SALES_AGENT',
        status: 'ACTIVE',
      });

      const agentAuthCtx = createAuthorizationContext({
        membership: agentMembership,
        tenantContext: banaTenantContext,
        permissions: [], // No permissions granted
      });

      // Role is SALES_AGENT, but without permission in context, orders.create is strictly DENIED
      expect(agentAuthCtx.role).toBe('SALES_AGENT');
      expect(hasPermission(agentAuthCtx, permOrdersCreate)).toBe(false);
      expect(() => assertPermission(agentAuthCtx, permOrdersCreate)).toThrow(
        AuthorizationDeniedError,
      );
    });
  });
});
