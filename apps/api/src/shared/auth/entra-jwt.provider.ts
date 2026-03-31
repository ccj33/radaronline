import type { FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { EntraAuthConfig } from '../../config/env.js';
import type { AuthProvider } from './auth.provider.js';
import type { CurrentSession, SessionUser, UserRole } from './auth.types.js';

const VALID_ROLES: UserRole[] = ['superadmin', 'admin', 'gestor', 'usuario'];

function normalizeRoleToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^radar[._-]/, '')
    .replace(/^role[._-]/, '');
}

function toRoleCandidate(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function extractMicroregionIds(payload: JWTPayload): { primary: string | null; all: string[] } {
  const claimKeys = ['microregionIds', 'microregionId', 'microregion_id', 'microregiao_id'];

  for (const key of claimKeys) {
    const rawValue = payload[key];

    if (Array.isArray(rawValue)) {
      const ids = rawValue
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => v && v !== 'all');
      if (ids.length > 0) return { primary: ids[0], all: ids };
      continue;
    }

    if (typeof rawValue === 'string') {
      const ids = rawValue
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v && v !== 'all');
      if (ids.length > 0) return { primary: ids[0], all: ids };
    }
  }

  return { primary: null, all: [] };
}

export function extractRoleFromClaims(
  payload: JWTPayload,
  roleClaim: string
): UserRole {
  const candidates = toRoleCandidate(payload[roleClaim]);

  for (const candidate of candidates) {
    const normalized = normalizeRoleToken(candidate);
    if (VALID_ROLES.includes(normalized as UserRole)) {
      return normalized as UserRole;
    }
  }

  return 'usuario';
}

export function mapEntraPayloadToSessionUser(
  payload: JWTPayload,
  roleClaim: string
): SessionUser {
  const id =
    typeof payload.oid === 'string'
      ? payload.oid
      : typeof payload.sub === 'string'
        ? payload.sub
        : '';

  const email =
    typeof payload.preferred_username === 'string'
      ? payload.preferred_username
      : typeof payload.email === 'string'
        ? payload.email
        : typeof payload.upn === 'string'
          ? payload.upn
          : '';

  const name =
    typeof payload.name === 'string' && payload.name.trim().length > 0
      ? payload.name
      : email || 'Usuario';

  const { primary, all } = extractMicroregionIds(payload);

  return {
    id,
    email,
    name,
    role: extractRoleFromClaims(payload, roleClaim),
    microregionId: primary,
    microregionIds: all,
  };
}

export class EntraJwtAuthProvider implements AuthProvider {
  private readonly jwks;

  constructor(private readonly config: EntraAuthConfig) {
    if (!config.issuer || !config.audience || !config.jwksUri) {
      throw new Error('ENTRA_AUTH_CONFIG_INVALID');
    }

    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  async getCurrentSession(request: FastifyRequest): Promise<CurrentSession> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false };
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      const user = mapEntraPayloadToSessionUser(payload, this.config.roleClaim);
      if (!user.id || !user.email) {
        return { authenticated: false };
      }

      return {
        authenticated: true,
        user,
      };
    } catch {
      return { authenticated: false };
    }
  }
}
