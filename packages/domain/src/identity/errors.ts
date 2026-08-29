/**
 * Thrown when an invalid user identifier string is provided to createUserId.
 */
export class InvalidUserIdError extends Error {
  override readonly name = 'InvalidUserIdError' as const;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an invalid membership identifier string is provided to createMembershipId.
 */
export class InvalidMembershipIdError extends Error {
  override readonly name = 'InvalidMembershipIdError' as const;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an invalid permission identifier string is provided to createPermission.
 */
export class InvalidPermissionError extends Error {
  override readonly name = 'InvalidPermissionError' as const;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
