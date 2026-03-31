import type { FastifyRequest } from 'fastify';

import type { AuthProvider } from './auth.provider.js';
import type { CurrentSession, UserRole } from './auth.types.js';

function parseRole(value: string | undefined): UserRole {
  if (value === 'superadmin' || value === 'admin' || value === 'gestor') {
    return value;
  }

  return 'usuario';
}

export class DevHeaderAuthProvider implements AuthProvider {
  async getCurrentSession(request: FastifyRequest): Promise<CurrentSession> {
    const userId = request.headers['x-dev-user-id'];
    const email = request.headers['x-dev-user-email'];
    const role = request.headers['x-dev-user-role'];
    const name = request.headers['x-dev-user-name'];
    const microregionId = request.headers['x-dev-user-microregion-id'];

    if (
      typeof userId !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string'
    ) {
      return { authenticated: false };
    }

    const rawMicroregionId =
      typeof microregionId === 'string' && microregionId.trim().length > 0
        ? microregionId.trim()
        : null;
    const microregionIds = rawMicroregionId
      ? rawMicroregionId.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const primaryMicroregionId = microregionIds[0] ?? null;

    return {
      authenticated: true,
      user: {
        id: userId,
        email,
        name,
        role: parseRole(typeof role === 'string' ? role : undefined),
        microregionId: primaryMicroregionId,
        microregionIds,
      },
    };
  }
}
