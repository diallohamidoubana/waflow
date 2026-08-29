import type { Permission } from '@waflow/domain';
import type { AuthorizationContext } from './context.js';
import type { AuthorizationDecision } from './decision.js';
import { AuthorizationDeniedError } from './errors.js';

/**
 * Checks whether an AuthorizationContext possesses a specific granted permission.
 * Pure deny-by-default check.
 *
 * @param context The active authorization context.
 * @param permission The required permission capability.
 * @returns True if explicitly granted, false otherwise.
 */
export function hasPermission(context: AuthorizationContext, permission: Permission): boolean {
  if (!context || !context.permissions) {
    return false;
  }
  return context.permissions.has(permission);
}

/**
 * Evaluates an authorization request and returns a structured decision with stable denial reason.
 *
 * @param context The active authorization context.
 * @param permission The required permission capability.
 * @returns An AuthorizationDecision with ALLOW or DENY and reason.
 */
export function evaluateAuthorization(
  context: AuthorizationContext,
  permission: Permission,
): AuthorizationDecision {
  if (!context || !context.permissions) {
    return {
      allowed: false,
      reason: 'INVALID_CONTEXT',
      details: 'Authorization context is missing or invalid.',
    };
  }

  if (context.permissions.has(permission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'PERMISSION_MISSING',
    details: `Required permission "${permission}" is not granted in the active authorization context.`,
  };
}

/**
 * Asserts that the active authorization context possesses a specific permission.
 * Throws AuthorizationDeniedError if the permission is missing.
 *
 * @param context The active authorization context.
 * @param permission The required permission capability.
 * @param customMessage Optional custom error message.
 * @throws {AuthorizationDeniedError} If permission is not granted.
 */
export function assertPermission(
  context: AuthorizationContext,
  permission: Permission,
  customMessage?: string,
): void {
  const decision = evaluateAuthorization(context, permission);

  if (!decision.allowed) {
    const message =
      customMessage ??
      `Access denied: permission "${permission}" is required for this operation in organization "${context?.organizationId}".`;
    throw new AuthorizationDeniedError(message, {
      reason: decision.reason,
      requiredPermission: permission,
      organizationId: context?.organizationId,
    });
  }
}
