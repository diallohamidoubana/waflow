/**
 * Base class for all database persistence errors in WAFLOW.
 */
export class DatabaseError extends Error {
  override readonly name: string = 'DatabaseError';
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when attempting to create a duplicate membership for a user in the same organization.
 */
export class DuplicateMembershipError extends DatabaseError {
  override readonly name = 'DuplicateMembershipError' as const;

  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    cause?: unknown,
  ) {
    super(
      `Membership already exists for user "${userId}" in organization "${organizationId}".`,
      cause,
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when database connectivity cannot be established or is lost.
 */
export class DatabaseConnectionError extends DatabaseError {
  override readonly name = 'DatabaseConnectionError' as const;

  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested database entity is not found within the expected boundary.
 */
export class RecordNotFoundError extends DatabaseError {
  override readonly name = 'RecordNotFoundError' as const;

  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
