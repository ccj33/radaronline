import type { UserRole } from '../types/auth.types';

export function isPrivilegedAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function getAssignableAdminRoles(actorRole: UserRole | undefined): UserRole[] {
  if (actorRole === 'superadmin') {
    return ['usuario', 'gestor', 'admin', 'superadmin'];
  }

  if (actorRole === 'admin') {
    return ['usuario', 'gestor'];
  }

  return [];
}

export function canAssignAdminRole(
  actorRole: UserRole | undefined,
  targetRole: UserRole
): boolean {
  return getAssignableAdminRoles(actorRole).includes(targetRole);
}

export function canManageAdminTarget(
  actorRole: UserRole | undefined,
  targetRole: UserRole
): boolean {
  if (actorRole === 'superadmin') {
    return true;
  }

  return actorRole === 'admin' && !isPrivilegedAdminRole(targetRole);
}

export function getAdminRoleAssignmentError(targetRole: UserRole): string {
  if (targetRole === 'superadmin') {
    return 'Apenas o Super Admin pode criar ou promover outro Super Admin.';
  }

  if (targetRole === 'admin') {
    return 'Apenas o Super Admin pode criar ou promover administradores.';
  }

  return 'Voce nao tem permissao para atribuir esse nivel de acesso.';
}

export function getAdminTargetManagementError(targetRole: UserRole): string {
  if (targetRole === 'superadmin') {
    return 'Apenas o Super Admin pode gerenciar contas de Super Admin.';
  }

  if (targetRole === 'admin') {
    return 'Apenas o Super Admin pode gerenciar contas de administrador.';
  }

  return 'Voce nao tem permissao para gerenciar este usuario.';
}
