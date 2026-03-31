import { parseMicroregiaoIds } from '../../lib/authHelpers';
import type { ProfileDTO, User } from '../../types/auth.types';

export function mapProfileToUser(profile: ProfileDTO): User {
  const ids = parseMicroregiaoIds(profile.microregiao_id);
  const primaryId = ids[0] || 'all';

  return {
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    role: profile.role,
    microregiaoId: primaryId,
    microregiaoIds: ids,
    ativo: profile.ativo,
    avatarId: profile.avatar_id || 'zg10',
    lgpdConsentimento: profile.lgpd_consentimento,
    lgpdConsentimentoData: profile.lgpd_consentimento_data || undefined,
    createdBy: profile.created_by || undefined,
    municipio: profile.municipio || undefined,
    firstAccess: profile.first_access ?? true,
    createdAt: profile.created_at,
  };
}

export function toProfileUpdatePayload(userUpdates: Partial<User>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (userUpdates.nome !== undefined) updateData.nome = userUpdates.nome;
  if (userUpdates.email !== undefined) updateData.email = userUpdates.email;
  if (userUpdates.role !== undefined) updateData.role = userUpdates.role;
  if (userUpdates.microregiaoId !== undefined) {
    updateData.microregiao_id = userUpdates.microregiaoId === 'all' ? null : userUpdates.microregiaoId;
  }
  if (userUpdates.ativo !== undefined) updateData.ativo = userUpdates.ativo;
  if (userUpdates.lgpdConsentimento !== undefined) {
    updateData.lgpd_consentimento = userUpdates.lgpdConsentimento;
  }

  return updateData;
}
