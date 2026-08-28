/**
 * Thrown when an invalid organization identifier string is provided to createOrganizationId.
 */
export class InvalidOrganizationIdError extends Error {
  override readonly name = 'InvalidOrganizationIdError' as const;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an operation attempts cross-tenant access or violates tenant isolation boundaries.
 */
export class TenantBoundaryViolationError extends Error {
  override readonly name = 'TenantBoundaryViolationError' as const;
  readonly expectedOrganizationId?: string | undefined;
  readonly actualOrganizationId?: string | undefined;

  constructor(
    message: string,
    options?: {
      readonly expectedOrganizationId?: string | undefined;
      readonly actualOrganizationId?: string | undefined;
    },
  ) {
    super(message);
    this.expectedOrganizationId = options?.expectedOrganizationId;
    this.actualOrganizationId = options?.actualOrganizationId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
