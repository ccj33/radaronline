import type { UserRole } from '../../shared/auth/auth.types.js';

export function isPrivilegedUserRole(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canActorAssignUserRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'superadmin') {
    return true;
  }

  return actorRole === 'admin' && !isPrivilegedUserRole(targetRole);
}

export function canActorManageTargetUser(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'superadmin') {
    return true;
  }

  return actorRole === 'admin' && !isPrivilegedUserRole(targetRole);
}

export function getRoleAssignmentForbiddenMessage(targetRole: UserRole): string {
  if (targetRole === 'superadmin') {
    return 'Only superadmin can create or promote another superadmin.';
  }

  if (targetRole === 'admin') {
    return 'Only superadmin can create or promote admin accounts.';
  }

  return 'The requested role assignment is not allowed.';
}

export function getPrivilegedTargetForbiddenMessage(targetRole: UserRole): string {
  if (targetRole === 'superadmin') {
    return 'Only superadmin can manage superadmin accounts.';
  }

  if (targetRole === 'admin') {
    return 'Only superadmin can manage admin accounts.';
  }

  return 'The target account is outside the allowed administrative scope.';
}
