import { describe, expect, it } from 'vitest';
import {
  InvalidOrganizationIdError,
  TenantBoundaryViolationError,
  type OrganizationId,
  type TenantContext,
  type TenantScoped,
  assertResourceMatchesContext,
  assertSameOrganization,
  createOrganizationId,
  createTenantContext,
  isOrganizationId,
  isSameOrganization,
} from './index.js';

// Test Fixture implementing TenantScoped (no product entity coupling)
interface MockOrder extends TenantScoped {
  readonly id: string;
  readonly total: number;
}

interface MockCustomer extends TenantScoped {
  readonly id: string;
  readonly name: string;
}

function createMockOrder(organizationId: OrganizationId, id: string, total: number): MockOrder {
  return Object.freeze({
    organizationId,
    id,
    total,
  });
}

function createMockCustomer(
  organizationId: OrganizationId,
  id: string,
  name: string,
): MockCustomer {
  return Object.freeze({
    organizationId,
    id,
    name,
  });
}

describe('Multi-Tenant Foundation — Domain Primitives & Boundary Invariants', () => {
  describe('OrganizationId', () => {
    it('Scenario A: should successfully create a valid OrganizationId from a non-empty string', () => {
      const orgId = createOrganizationId('org_bana_shop_001');
      expect(orgId).toBe('org_bana_shop_001');
      expect(isOrganizationId(orgId)).toBe(true);
    });

    it('should trim surrounding whitespace when creating OrganizationId', () => {
      const orgId = createOrganizationId('  org_sofia_dist_002  ');
      expect(orgId).toBe('org_sofia_dist_002');
      expect(isOrganizationId(orgId)).toBe(true);
    });

    it('Scenario B: should reject empty string identifier with InvalidOrganizationIdError', () => {
      expect(() => createOrganizationId('')).toThrow(InvalidOrganizationIdError);
      expect(() => createOrganizationId('')).toThrow('cannot be empty or whitespace-only');
    });

    it('Scenario C: should reject whitespace-only identifier with InvalidOrganizationIdError', () => {
      expect(() => createOrganizationId('   \t\n  ')).toThrow(InvalidOrganizationIdError);
      expect(() => createOrganizationId('   ')).toThrow('cannot be empty or whitespace-only');
    });

    it('should reject non-string input with InvalidOrganizationIdError', () => {
      // @ts-expect-error Testing runtime invalid input
      expect(() => createOrganizationId(null)).toThrow(InvalidOrganizationIdError);
      // @ts-expect-error Testing runtime invalid input
      expect(() => createOrganizationId(undefined)).toThrow(InvalidOrganizationIdError);
      // @ts-expect-error Testing runtime invalid input
      expect(() => createOrganizationId(12345)).toThrow(InvalidOrganizationIdError);
    });

    it('should correctly evaluate isOrganizationId type guard', () => {
      expect(isOrganizationId('org_valid')).toBe(true);
      expect(isOrganizationId('')).toBe(false);
      expect(isOrganizationId('   ')).toBe(false);
      expect(isOrganizationId(null)).toBe(false);
      expect(isOrganizationId(undefined)).toBe(false);
      expect(isOrganizationId({})).toBe(false);
    });
  });

  describe('TenantContext', () => {
    it('Scenario D: should create an immutable TenantContext requiring an OrganizationId', () => {
      const orgId = createOrganizationId('org_bana_shop');
      const context = createTenantContext(orgId);

      expect(context.organizationId).toBe(orgId);
      expect(Object.isFrozen(context)).toBe(true);
    });

    it('should create TenantContext from raw string and validate it internally', () => {
      const context = createTenantContext('org_danaya_cargo');
      expect(context.organizationId).toBe('org_danaya_cargo');
    });

    it('Scenario I: should reject missing or invalid tenant without falling back to any default', () => {
      expect(() => createTenantContext('')).toThrow(InvalidOrganizationIdError);
      expect(() => createTenantContext('   ')).toThrow(InvalidOrganizationIdError);
      // @ts-expect-error Testing runtime invalid input
      expect(() => createTenantContext(undefined)).toThrow(InvalidOrganizationIdError);
      // @ts-expect-error Testing runtime invalid input
      expect(() => createTenantContext(null)).toThrow(InvalidOrganizationIdError);
    });
  });

  describe('Tenant Isolation & Guards', () => {
    it('Scenario E: should accept two resources belonging to the same organization', () => {
      const banaOrgId = createOrganizationId('org_bana_shop');
      const order = createMockOrder(banaOrgId, 'ord_101', 5000);
      const customer = createMockCustomer(banaOrgId, 'cust_201', 'Amadou');

      expect(isSameOrganization(order, customer)).toBe(true);
      expect(isSameOrganization(order, banaOrgId)).toBe(true);
      expect(() => assertSameOrganization(order, customer)).not.toThrow();
      expect(() => assertSameOrganization(order, banaOrgId)).not.toThrow();
    });

    it('Scenario F: should reject operations between resources of different organizations', () => {
      const banaOrgId = createOrganizationId('org_bana_shop');
      const sofiaOrgId = createOrganizationId('org_sofia_dist');

      const banaOrder = createMockOrder(banaOrgId, 'ord_101', 5000);
      const sofiaCustomer = createMockCustomer(sofiaOrgId, 'cust_999', 'Fatou');

      expect(isSameOrganization(banaOrder, sofiaCustomer)).toBe(false);
      expect(() => assertSameOrganization(banaOrder, sofiaCustomer)).toThrow(
        TenantBoundaryViolationError,
      );
    });

    it('Scenario G: should produce dedicated TenantBoundaryViolationError with metadata upon violation', () => {
      const banaOrgId = createOrganizationId('org_bana_shop');
      const danayaOrgId = createOrganizationId('org_danaya_cargo');

      const banaOrder = createMockOrder(banaOrgId, 'ord_101', 5000);
      const danayaContext = createTenantContext(danayaOrgId);

      try {
        assertSameOrganization(banaOrder, danayaContext);
        expect.unreachable('Should have thrown TenantBoundaryViolationError');
      } catch (err) {
        expect(err).toBeInstanceOf(TenantBoundaryViolationError);
        const violation = err as TenantBoundaryViolationError;
        expect(violation.name).toBe('TenantBoundaryViolationError');
        expect(violation.expectedOrganizationId).toBe('org_bana_shop');
        expect(violation.actualOrganizationId).toBe('org_danaya_cargo');
        expect(violation.message).toContain('Tenant boundary violation');
      }
    });

    it('should assert resource matches active TenantContext', () => {
      const banaOrgId = createOrganizationId('org_bana_shop');
      const sofiaOrgId = createOrganizationId('org_sofia_dist');

      const banaOrder = createMockOrder(banaOrgId, 'ord_101', 5000);
      const banaContext = createTenantContext(banaOrgId);
      const sofiaContext = createTenantContext(sofiaOrgId);

      expect(() => assertResourceMatchesContext(banaOrder, banaContext)).not.toThrow();
      expect(() => assertResourceMatchesContext(banaOrder, sofiaContext)).toThrow(
        TenantBoundaryViolationError,
      );
    });

    it('Scenario H: organization switching/context replacement must never alter existing resource ownership', () => {
      const banaOrgId = createOrganizationId('org_bana_shop');
      const sofiaOrgId = createOrganizationId('org_sofia_dist');

      // User starts session in Bana Shop
      let currentContext: TenantContext = createTenantContext(banaOrgId);
      const banaOrder = createMockOrder(currentContext.organizationId, 'ord_bana_001', 12000);

      expect(banaOrder.organizationId).toBe(banaOrgId);
      expect(() => assertResourceMatchesContext(banaOrder, currentContext)).not.toThrow();

      // User switches organization in UI to Sofia Distribution
      currentContext = createTenantContext(sofiaOrgId);

      // Invariant: The order remains owned by Bana Shop
      expect(banaOrder.organizationId).toBe(banaOrgId);
      expect(banaOrder.organizationId).not.toBe(currentContext.organizationId);

      // Attempting to access Bana Shop order in Sofia Distribution context fails
      expect(() => assertResourceMatchesContext(banaOrder, currentContext)).toThrow(
        TenantBoundaryViolationError,
      );
    });
  });
});
