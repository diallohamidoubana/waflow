export const PACKAGE_NAME = '@waflow/database';

// Errors
export * from './errors/index.js';

// Health & Lifecycle
export {
  checkDatabaseHealth,
  disconnectDatabaseClient,
  type DatabaseHealthResult,
} from './client/index.js';

// Mappers
export { mapDatabaseMembership } from './mappers/membership.js';
export { mapDatabaseOrganization, type PersistedOrganization } from './mappers/organization.js';
export { mapDatabaseUser, type PersistedUser } from './mappers/user.js';

// Repositories
export {
  createMembershipRepository,
  type MembershipRepository,
  type CreateMembershipParams,
} from './repositories/membership-repository.js';
export {
  createOrganizationRepository,
  type OrganizationRepository,
} from './repositories/organization-repository.js';
export { createUserRepository, type UserRepository } from './repositories/user-repository.js';
