import { User, RaciPermission, RaciEntry } from '../types/auth.types';
import { Action, RaciRole } from '../types';
import { isAdminLike, canMatchMicro } from '../lib/authHelpers';

// =====================================
// MAPEAMENTO DE PERMISSÕES RACI
// =====================================

export const RACI_PERMISSIONS: Record<RaciRole, RaciPermission> = {
  'R': { // Responsible - Quem executa
    visualizar: true,
    editar: true,
    criar: true,
    excluir: false,
  },
  'A': { // Accountable - Quem aprova
    visualizar: true,
    editar: true,
    criar: true,
    excluir: true,
  },
  'I': { // Informed - Informado
    visualizar: true,
    editar: false,
    criar: false,
    excluir: false,
  },
};

// =====================================
// FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO
// =====================================

/**
 * Obtém o papel RACI do usuário em uma ação específica.
 * Suporta busca por userId (novo) e por nome (legado).
 */
export function getUserRaciRole(user: User, action: Action): RaciRole | null {
  const entries = action.raci as RaciEntry[] | undefined;
  const entry = entries?.find((r) => {
    // Novo formato: busca por userId
    if (r.userId) return r.userId === user.id;
    // Legado: busca por nome
    return r.name === user.nome;
  });
  return entry?.role || null;
}

/**
 * Verifica se usuário pode VISUALIZAR uma ação
 */
export function canViewAction(user: User, _action: Action, actionMicroregiaoId?: string): boolean {
  // Admin/SuperAdmin pode ver tudo
  if (isAdminLike(user.role)) return true;

  // Verifica se está na mesma microrregião
  return canMatchMicro(user.microregiaoId, actionMicroregiaoId);
}

/**
 * Verifica se usuário pode EDITAR uma ação
 */
export function canEditAction(user: User, action: Action, actionMicroregiaoId?: string): boolean {
  // Admin/SuperAdmin pode editar tudo
  if (isAdminLike(user.role)) return true;

  // Gestor pode editar qualquer ação da sua microrregião
  if (user.role === 'gestor') {
    return canMatchMicro(user.microregiaoId, actionMicroregiaoId);
  }

  // Verifica microrregião
  if (!canMatchMicro(user.microregiaoId, actionMicroregiaoId)) {
    return false;
  }

  // Usuário comum: verifica papel RACI
  const raciRole = getUserRaciRole(user, action);
  if (!raciRole) return false;

  return !!RACI_PERMISSIONS[raciRole]?.editar;
}

/**
 * Verifica se usuário pode CRIAR ações
 */
export function canCreateAction(user: User): boolean {
  // Admin, SuperAdmin e Gestor podem criar
  return isAdminLike(user.role) || user.role === 'gestor';
}

/**
 * Verifica se usuário pode EXCLUIR uma ação
 */
export function canDeleteAction(user: User, action: Action, actionMicroregiaoId?: string): boolean {
  // Admin/SuperAdmin pode excluir qualquer coisa
  if (isAdminLike(user.role)) return true;

  // Verifica microrregião
  if (!canMatchMicro(user.microregiaoId, actionMicroregiaoId)) {
    return false;
  }

  // Gestor pode excluir na sua microrregião
  if (user.role === 'gestor') return true;

  // Usuário comum: só 'A' (Accountable) pode excluir
  const raciRole = getUserRaciRole(user, action);
  return raciRole === 'A';
}

/**
 * Verifica se usuário pode GERENCIAR EQUIPE de uma ação
 */
export function canManageTeam(user: User, action: Action, actionMicroregiaoId?: string): boolean {
  // Admin/SuperAdmin pode tudo
  if (isAdminLike(user.role)) return true;

  // Verifica microrregião
  if (!canMatchMicro(user.microregiaoId, actionMicroregiaoId)) {
    return false;
  }

  // Gestor pode gerenciar equipe
  if (user.role === 'gestor') return true;

  // Usuário comum: apenas R ou A podem gerenciar equipe
  const raciRole = getUserRaciRole(user, action);
  return raciRole === 'R' || raciRole === 'A';
}

/**
 * Verifica se usuário pode acessar o painel admin
 */
export function canAccessAdmin(user: User): boolean {
  return isAdminLike(user.role);
}

/**
 * Verifica se usuário pode criar outros usuários
 */
export function canCreateUsers(user: User): boolean {
  return isAdminLike(user.role);
}

/**
 * Verifica se usuário pode ver todas as microrregiões
 */
export function canViewAllMicroregioes(user: User): boolean {
  return isAdminLike(user.role);
}

// =====================================
// HELPER: Obter lista de permissões do usuário
// =====================================

export type UserPermissions = {
  canCreate: boolean;
  canAccessAdmin: boolean;
  canViewAllMicroregioes: boolean;
  canCreateUsers: boolean;
};

export function getUserPermissions(user: User): UserPermissions {
  return {
    canCreate: canCreateAction(user),
    canAccessAdmin: canAccessAdmin(user),
    canViewAllMicroregioes: canViewAllMicroregioes(user),
    canCreateUsers: canCreateUsers(user),
  };
}
