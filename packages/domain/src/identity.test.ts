import { describe, expect, it } from 'vitest';
import {
  InvalidMembershipIdError,
  InvalidMembershipStatusError,
  InvalidOrganizationRoleError,
  InvalidPermissionError,
  InvalidUserIdError,
  createMembershipId,
  createOrganizationId,
  createOrganizationMembership,
  createPermission,
  createUserId,
  isMembershipId,
  isMembershipStatus,
  isOrganizationRole,
  isPermission,
  isUserId,
  MEMBERSHIP_STATUSES,
  ORGANIZATION_ROLES,
} from './index.js';

describe('Identity & Membership Foundation — Domain Primitives', () => {
  describe('UserId', () => {
    it('Scenario A: should successfully create a valid UserId from non-empty string', () => {
      const userId = createUserId('usr_hamidou_001');
      expect(userId).toBe('usr_hamidou_001');
      expect(isUserId(userId)).toBe(true);
    });

    it('should trim whitespace when creating UserId', () => {
      const userId = createUserId('  usr_diallo_002  ');
      expect(userId).toBe('usr_diallo_002');
      expect(isUserId(userId)).toBe(true);
    });

    it('Scenario B: should reject empty string identifier with InvalidUserIdError', () => {
      expect(() => createUserId('')).toThrow(InvalidUserIdError);
      expect(() => createUserId('')).toThrow('cannot be empty or whitespace-only');
    });

    it('Scenario C: should reject whitespace-only identifier with InvalidUserIdError', () => {
      expect(() => createUserId('   \t\n  ')).toThrow(InvalidUserIdError);
      expect(() => createUserId('   ')).toThrow('cannot be empty or whitespace-only');
    });

    it('should reject non-string inputs for UserId', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(() => createUserId(null)).toThrow(InvalidUserIdError);
      // @ts-expect-error Testing invalid runtime input
      expect(() => createUserId(undefined)).toThrow(InvalidUserIdError);
      // @ts-expect-error Testing invalid runtime input
      expect(() => createUserId(9999)).toThrow(InvalidUserIdError);
    });

    it('should correctly evaluate isUserId type guard', () => {
      expect(isUserId('usr_abc')).toBe(true);
      expect(isUserId('')).toBe(false);
      expect(isUserId('   ')).toBe(false);
      expect(isUserId(null)).toBe(false);
      expect(isUserId(undefined)).toBe(false);
    });
  });

  describe('MembershipId', () => {
    it('Scenario D: should successfully create a valid MembershipId', () => {
      const memId = createMembershipId('mem_bana_hamidou_01');
      expect(memId).toBe('mem_bana_hamidou_01');
      expect(isMembershipId(memId)).toBe(true);
    });

    it('Scenario E: should reject empty string MembershipId with InvalidMembershipIdError', () => {
      expect(() => createMembershipId('')).toThrow(InvalidMembershipIdError);
      expect(() => createMembershipId('   ')).toThrow(InvalidMembershipIdError);
    });

    it('should reject non-string inputs for MembershipId', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(() => createMembershipId(null)).toThrow(InvalidMembershipIdError);
      // @ts-expect-error Testing invalid runtime input
      expect(() => createMembershipId(undefined)).toThrow(InvalidMembershipIdError);
    });

    it('should correctly evaluate isMembershipId type guard', () => {
      expect(isMembershipId('mem_123')).toBe(true);
      expect(isMembershipId('')).toBe(false);
      expect(isMembershipId(null)).toBe(false);
    });
  });

  describe('OrganizationRole & MembershipStatus', () => {
    it('should recognize all canonical organization roles', () => {
      expect(ORGANIZATION_ROLES).toEqual([
        'OWNER',
        'ADMIN',
        'SALES_MANAGER',
        'SALES_AGENT',
        'SUPPORT_AGENT',
        'OPERATIONS_MANAGER',
      ]);

      expect(isOrganizationRole('OWNER')).toBe(true);
      expect(isOrganizationRole('ADMIN')).toBe(true);
      expect(isOrganizationRole('SALES_AGENT')).toBe(true);
      expect(isOrganizationRole('SUPER_ADMIN')).toBe(false);
      expect(isOrganizationRole('ROOT')).toBe(false);
      expect(isOrganizationRole('')).toBe(false);
    });

    it('should recognize valid membership statuses', () => {
      expect(MEMBERSHIP_STATUSES).toEqual(['ACTIVE', 'SUSPENDED']);
      expect(isMembershipStatus('ACTIVE')).toBe(true);
      expect(isMembershipStatus('SUSPENDED')).toBe(true);
      expect(isMembershipStatus('PENDING')).toBe(false);
      expect(isMembershipStatus('INVITED')).toBe(false);
    });
  });

  describe('OrganizationMembership', () => {
    it('Scenario F: should construct an immutable membership binding exactly 1 user to 1 organization', () => {
      const userId = createUserId('usr_hamidou');
      const orgId = createOrganizationId('org_bana_shop');
      const memId = createMembershipId('mem_001');

      const membership = createOrganizationMembership({
        membershipId: memId,
        userId,
        organizationId: orgId,
        role: 'OWNER',
        status: 'ACTIVE',
      });

      expect(membership.membershipId).toBe(memId);
      expect(membership.userId).toBe(userId);
      expect(membership.organizationId).toBe(orgId);
      expect(membership.role).toBe('OWNER');
      expect(membership.status).toBe('ACTIVE');
      expect(Object.isFrozen(membership)).toBe(true);
    });

    it('Scenario K: should reject invalid runtime organization role with InvalidOrganizationRoleError', () => {
      const userId = createUserId('usr_hamidou');
      const orgId = createOrganizationId('org_bana_shop');
      const memId = createMembershipId('mem_001');

      expect(() =>
        createOrganizationMembership({
          membershipId: memId,
          userId,
          organizationId: orgId,
          // @ts-expect-error Testing invalid runtime role
          role: 'ROOT',
          status: 'ACTIVE',
        }),
      ).toThrow(InvalidOrganizationRoleError);

      expect(() =>
        createOrganizationMembership({
          membershipId: memId,
          userId,
          organizationId: orgId,
          // @ts-expect-error Testing invalid runtime role
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        }),
      ).toThrow(InvalidOrganizationRoleError);
    });

    it('Scenario L: should reject invalid runtime membership status with InvalidMembershipStatusError', () => {
      const userId = createUserId('usr_hamidou');
      const orgId = createOrganizationId('org_bana_shop');
      const memId = createMembershipId('mem_001');

      expect(() =>
        createOrganizationMembership({
          membershipId: memId,
          userId,
          organizationId: orgId,
          role: 'OWNER',
          // @ts-expect-error Testing invalid runtime status
          status: 'DELETED',
        }),
      ).toThrow(InvalidMembershipStatusError);

      expect(() =>
        createOrganizationMembership({
          membershipId: memId,
          userId,
          organizationId: orgId,
          role: 'OWNER',
          // @ts-expect-error Testing invalid runtime status
          status: 'INVITED',
        }),
      ).toThrow(InvalidMembershipStatusError);
    });
  });

  describe('Permission', () => {
    it('should create valid strongly-typed permission', () => {
      const perm = createPermission('orders.create');
      expect(perm).toBe('orders.create');
      expect(isPermission(perm)).toBe(true);
    });

    it('should reject empty or whitespace permission', () => {
      expect(() => createPermission('')).toThrow(InvalidPermissionError);
      expect(() => createPermission('   ')).toThrow(InvalidPermissionError);
    });

    it('Scenario E: should reject wildcard "*" permission', () => {
      expect(() => createPermission('*')).toThrow(InvalidPermissionError);
      expect(isPermission('*')).toBe(false);
    });

    it('Scenario F: should reject wildcard prefix "orders.*"', () => {
      expect(() => createPermission('orders.*')).toThrow(InvalidPermissionError);
      expect(isPermission('orders.*')).toBe(false);
    });

    it('Scenario G: should reject wildcard suffix "*.read"', () => {
      expect(() => createPermission('*.read')).toThrow(InvalidPermissionError);
      expect(isPermission('*.read')).toBe(false);
    });

    it('Scenario H: should reject wildcard colon format "orders:*"', () => {
      expect(() => createPermission('orders:*')).toThrow(InvalidPermissionError);
      expect(isPermission('orders:*')).toBe(false);
    });

    it('Scenario I: should reject uppercase bypass "ALL"', () => {
      expect(() => createPermission('ALL')).toThrow(InvalidPermissionError);
      expect(isPermission('ALL')).toBe(false);
    });

    it('Scenario J: should reject case-insensitive bypass tokens ("all", "All", "super", "admin")', () => {
      expect(() => createPermission('all')).toThrow(InvalidPermissionError);
      expect(() => createPermission('All')).toThrow(InvalidPermissionError);
      expect(() => createPermission('super')).toThrow(InvalidPermissionError);
      expect(() => createPermission('admin')).toThrow(InvalidPermissionError);
      expect(isPermission('all')).toBe(false);
      expect(isPermission('All')).toBe(false);
    });
  });
});
