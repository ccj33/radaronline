import type { FastifyReply, FastifyRequest } from 'fastify';

import { problem } from '../http/problem.js';
import type { CurrentSession, SessionUser, UserRole } from './auth.types.js';

const GLOBAL_SCOPE_ROLES: UserRole[] = ['superadmin', 'admin'];

function normalizeMicroregionId(value: string | null | undefined): string | undefined {
  const normalized = (value || '').trim();
  if (!normalized || normalized === 'all') {
    return undefined;
  }

  return normalized;
}

export function isGlobalScopeRole(role: UserRole): boolean {
  return GLOBAL_SCOPE_ROLES.includes(role);
}

export function isPrivilegedActor(actor: SessionUser): boolean {
  return isGlobalScopeRole(actor.role);
}

export function assertMicroregionAccess(
  actor: SessionUser,
  microregionId?: string | null
): string | undefined {
  const normalizedMicroregionId = normalizeMicroregionId(microregionId);

  if (isGlobalScopeRole(actor.role)) {
    return normalizedMicroregionId;
  }

  // Suporta gestores com múltiplas micros (microregionIds[])
  const accessibleIds = actor.microregionIds?.length
    ? actor.microregionIds
    : actor.microregionId
      ? [actor.microregionId]
      : [];

  if (accessibleIds.length === 0) {
    throw new Error('FORBIDDEN_SCOPE');
  }

  if (normalizedMicroregionId) {
    if (!accessibleIds.includes(normalizedMicroregionId)) {
      throw new Error('FORBIDDEN_SCOPE');
    }
    return normalizedMicroregionId;
  }

  // Nenhuma micro específica requisitada → retorna a primária
  return normalizeMicroregionId(actor.microregionId) || accessibleIds[0];
}

export function requireScopedMicroregion(
  actor: SessionUser,
  microregionId?: string | null
): string {
  const resolved = assertMicroregionAccess(actor, microregionId);
  if (!resolved) {
    throw new Error('MISSING_MICROREGION');
  }

  return resolved;
}

export function resolveScopedMicroregion(
  actor: SessionUser,
  requestedMicroregionId?: string | null
): string | undefined {
  return assertMicroregionAccess(actor, requestedMicroregionId);
}

export function extractActionMicroregionId(actionUid: string): string | null {
  const [microregionId] = actionUid.split('::');
  return microregionId?.trim() ? microregionId.trim() : null;
}

export function assertActionAccess(actor: SessionUser, actionUid: string): string | null {
  const actionMicroregionId = extractActionMicroregionId(actionUid);

  if (!actionMicroregionId) {
    if (isGlobalScopeRole(actor.role)) {
      return null;
    }

    throw new Error('FORBIDDEN_SCOPE');
  }

  assertMicroregionAccess(actor, actionMicroregionId);
  return actionMicroregionId;
}

export function assertAuthenticated(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | null> {
  return request.server.authProviderSession(request).then((session: CurrentSession) => {
    if (!session.authenticated) {
      void problem(reply, 401, 'Unauthorized', 'Authentication is required.');
      return null;
    }

    return session.user;
  });
}

export function assertRole(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: UserRole[]
): Promise<SessionUser | null> {
  return assertAuthenticated(request, reply).then((user) => {
    if (!user) {
      return null;
    }

    if (!allowedRoles.includes(user.role)) {
      void problem(reply, 403, 'Forbidden', 'User does not have the required role.');
      return null;
    }

    return user;
  });
}
