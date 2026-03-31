import type { User, UserRole } from '../types/auth.types';
import { parseMicroregiaoIds } from '../lib/authHelpers';

import { apiRequest } from './apiClient';

type BackendAuthProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  microregionId: string | null;
  active: boolean;
  lgpdAccepted: boolean;
  lgpdAcceptedAt: string | null;
  avatarId: string | null;
  municipality: string | null;
  firstAccess: boolean;
  createdAt: string;
};

function mapBackendAuthProfile(profile: BackendAuthProfile): User {
  const ids = parseMicroregiaoIds(profile.microregionId);

  return {
    id: profile.id,
    nome: profile.name,
    email: profile.email,
    role: profile.role,
    microregiaoId: ids[0] || 'all',
    microregiaoIds: ids,
    ativo: profile.active,
    lgpdConsentimento: profile.lgpdAccepted,
    lgpdConsentimentoData: profile.lgpdAcceptedAt || undefined,
    avatarId: profile.avatarId || 'zg10',
    municipio: profile.municipality || undefined,
    firstAccess: profile.firstAccess,
    createdAt: profile.createdAt,
  };
}

export async function getCurrentUserProfileViaBackendApi(): Promise<User> {
  const profile = await apiRequest<BackendAuthProfile>('/v1/auth/profile');
  return mapBackendAuthProfile(profile);
}

export async function acceptLgpdViaBackendApi(): Promise<void> {
  await apiRequest<void>('/v1/auth/lgpd/accept', {
    method: 'POST',
  });
}

export async function completeFirstAccessViaBackendApi(input: {
  userId: string;
  userEmail: string;
  municipio: string;
  newPassword: string;
  microregionId: string;
}): Promise<void> {
  await apiRequest<void>('/v1/auth/first-access/complete', {
    method: 'POST',
    body: input,
  });
}
