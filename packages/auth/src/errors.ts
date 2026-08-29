import type { OrganizationId, Permission } from '@waflow/domain';
import type { AuthorizationDenialReason } from './decision.js';

/**
 * Thrown when an authorization check is denied or fails security invariant enforcement.
 */
export class AuthorizationDeniedError extends Error {
  override readonly name = 'AuthorizationDeniedError' as const;
  readonly reason: AuthorizationDenialReason;
  readonly requiredPermission?: Permission | undefined;
  readonly organizationId?: OrganizationId | undefined;

  constructor(
    message: string,
    options?: {
      readonly reason?: AuthorizationDenialReason | undefined;
      readonly requiredPermission?: Permission | undefined;
      readonly organizationId?: OrganizationId | undefined;
    },
  ) {
    super(message);
    this.reason = options?.reason ?? 'INVALID_CONTEXT';
    this.requiredPermission = options?.requiredPermission;
    this.organizationId = options?.organizationId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an AuthorizationContext cannot be constructed due to invalid or corrupt parameters.
 */
export class InvalidAuthorizationContextError extends Error {
  override readonly name = 'InvalidAuthorizationContextError' as const;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
