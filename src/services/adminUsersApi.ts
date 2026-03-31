import type { User, UserRole } from '../types/auth.types';
import { parseMicroregiaoIds } from '../lib/authHelpers';

import { apiRequest } from './apiClient';

type BackendUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  microregionId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapBackendUser(user: BackendUser): User {
  const ids = parseMicroregiaoIds(user.microregionId);

  return {
    id: user.id,
    nome: user.name,
    email: user.email,
    role: user.role,
    microregiaoId: ids[0] || 'all',
    microregiaoIds: ids,
    ativo: user.active,
    lgpdConsentimento: false,
    avatarId: 'zg10',
    firstAccess: false,
    createdAt: user.createdAt,
  };
}

export type UserImportInputRow = {
  rowNumber?: number;
  name?: string;
  email?: string;
  role?: string;
  microregions?: string;
  municipality?: string;
};

export type UserImportMicroregionResolution = {
  input: string;
  status: 'exact-id' | 'exact-code' | 'exact-name' | 'exact-alias' | 'fuzzy' | 'ambiguous' | 'none';
  id: string | null;
  code: string | null;
  name: string | null;
  suggestions: string[];
};

export type UserImportPreviewRow = {
  rowNumber: number;
  name: string;
  email: string;
  roleInput: string;
  role: UserRole | null;
  microregionsInput: string;
  municipality: string | null;
  normalizedMicroregionIds: string[];
  normalizedMicroregionNames: string[];
  microregions: UserImportMicroregionResolution[];
  status: 'ready' | 'review' | 'error' | 'duplicate';
  issues: string[];
  warnings: string[];
};

export type UserImportPreviewResponse = {
  rows: UserImportPreviewRow[];
  summary: {
    total: number;
    ready: number;
    review: number;
    error: number;
    duplicate: number;
  };
};

export type UserImportCommitRow = UserImportPreviewRow & {
  result: 'created' | 'skipped' | 'failed';
  userId: string | null;
  temporaryPassword: string | null;
  loginUrl: string | null;
};

export type UserImportCommitResponse = {
  rows: UserImportCommitRow[];
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
  csvFileName: string;
  csvContent: string;
};

export async function listUsersViaBackendApi(): Promise<User[]> {
  const response = await apiRequest<{ items: BackendUser[] }>('/v1/users');
  return response.items.map(mapBackendUser);
}

export async function createUserViaBackendApi(payload: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  microregiaoId?: string;
}): Promise<User> {
  const user = await apiRequest<BackendUser>('/v1/users', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.senha,
      name: payload.nome,
      role: payload.role,
      microregionId:
        payload.microregiaoId && payload.microregiaoId !== 'all' ? payload.microregiaoId : null,
    },
  });

  return mapBackendUser(user);
}

export async function updateUserViaBackendApi(
  userId: string,
  payload: Partial<User> & { senha?: string }
): Promise<User> {
  if (payload.senha) {
    await apiRequest<void>(`/v1/users/${userId}/reset-password`, {
      method: 'POST',
      body: { password: payload.senha },
    });
  }

  const patchBody: Record<string, unknown> = {};
  if (payload.nome !== undefined) patchBody.name = payload.nome;
  if (payload.role !== undefined) patchBody.role = payload.role;
  if (payload.ativo !== undefined) patchBody.active = payload.ativo;
  if (payload.microregiaoId !== undefined) {
    patchBody.microregionId = payload.microregiaoId === 'all' ? null : payload.microregiaoId;
  }

  if (Object.keys(patchBody).length === 0) {
    const currentUser = await apiRequest<BackendUser>(`/v1/users/${userId}`);
    return mapBackendUser(currentUser);
  }

  const user = await apiRequest<BackendUser>(`/v1/users/${userId}`, {
    method: 'PATCH',
    body: patchBody,
  });

  return mapBackendUser(user);
}

export async function deleteUserViaBackendApi(userId: string): Promise<void> {
  await apiRequest<void>(`/v1/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function previewUsersImportViaBackendApi(
  rows: UserImportInputRow[]
): Promise<UserImportPreviewResponse> {
  return apiRequest<UserImportPreviewResponse>('/v1/users/import/preview', {
    method: 'POST',
    body: { rows },
  });
}

export async function commitUsersImportViaBackendApi(args: {
  rows: UserImportInputRow[];
  loginUrl?: string;
}): Promise<UserImportCommitResponse> {
  return apiRequest<UserImportCommitResponse>('/v1/users/import/commit', {
    method: 'POST',
    body: {
      rows: args.rows,
      loginUrl: args.loginUrl,
    },
  });
}
