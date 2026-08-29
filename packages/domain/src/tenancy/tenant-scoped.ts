import type { OrganizationId } from './organization-id.js';

/**
 * Domain invariant marker interface for any entity, aggregate, or resource
 * owned by a specific organization (tenant).
 */
export interface TenantScoped {
  readonly organizationId: OrganizationId;
}
