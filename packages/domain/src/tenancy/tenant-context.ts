import { createOrganizationId, isOrganizationId, type OrganizationId } from './organization-id.js';

/**
 * Minimal, explicit tenant context abstraction.
 * Answers exactly one question:
 * "Which organization boundary is this operation executing inside?"
 *
 * Immutable and explicit. No ambient global state.
 */
export interface TenantContext {
  readonly organizationId: OrganizationId;
}

/**
 * Creates an immutable TenantContext for a given organization.
 *
 * @param organizationId A validated OrganizationId or raw identifier string.
 * @returns An immutable TenantContext instance.
 */
export function createTenantContext(organizationId: OrganizationId | string): TenantContext {
  const validOrgId = isOrganizationId(organizationId)
    ? organizationId
    : createOrganizationId(organizationId);

  return Object.freeze({
    organizationId: validOrgId,
  });
}
