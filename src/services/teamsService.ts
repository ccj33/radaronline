
import type { TeamMember } from '../types';
import { logWarn, logError } from '../lib/logger';
import { createUserRequestsBatch } from './requestsService';
import { recordAutomatedEvent } from './automatedEventsService';
import {
  addTeamMemberViaBackendApi,
  deletePendingRegistrationViaBackendApi,
  getUserTeamStatusViaBackendApi,
  loadPendingRegistrationsViaBackendApi,
  loadTeamsViaBackendApi,
  removeTeamMemberViaBackendApi,
  saveUserMunicipalityViaBackendApi,
} from './teamsApi';
import { mapPendingRegistration, mapTeamDTOToTeamMember, mergeProfilesAndTeams, normalizeEmail } from './teams/teamsService.helpers';
import {
  deletePendingRegistrationRecord,
  deleteTeamRecord,
  fetchMicroNameById,
  findProfileIdByEmail,
  findTeamStatusByEmail,
  insertTeamRecord,
  listActiveProfiles,
  listAdminIds,
  listPendingRegistrationRows,
  listTeamIdsByEmail,
  listTeamRecords,
  updateProfileMunicipalityByEmail,
  updateTeamRecordsByIds,
} from './teams/teamsService.repositories';
import type { PendingRegistration } from './teams/teamsService.types';
import { shouldUseBackendTeamsApi } from './apiClient';
export type { PendingRegistration } from './teams/teamsService.types';

async function notifyAdminsOfPendingUser(name: string, email: string, microId: string) {
  const adminIds = await listAdminIds();
  if (adminIds.length === 0) return;

  const notifications = adminIds.map((adminId) => ({
    userId: adminId,
    requestType: 'system',
    content: `Membro pendente de cadastro: ${name} (${email}) na Micro ${microId}. Necess\u00E1rio criar conta.`,
    status: 'pending' as const,
  }));

  await createUserRequestsBatch(notifications);
}

export async function loadTeams(microregiaoId?: string): Promise<Record<string, TeamMember[]>> {
  try {
    if (shouldUseBackendTeamsApi()) {
      return await loadTeamsViaBackendApi(microregiaoId);
    }

    const [profilesDataResult, teamsData] = await Promise.allSettled([
      listActiveProfiles(microregiaoId),
      listTeamRecords(microregiaoId),
    ]);

    const profilesData =
      profilesDataResult.status === 'fulfilled' ? profilesDataResult.value : [];

    if (profilesDataResult.status === 'rejected') {
      logError('teamsService', 'Erro ao carregar perfis', profilesDataResult.reason);
    }

    if (teamsData.status === 'rejected') {
      logError('teamsService', 'Erro ao carregar equipes', teamsData.reason);
      throw teamsData.reason;
    }

    return mergeProfilesAndTeams(profilesData, teamsData.value);
  } catch (error) {
    logError('teamsService', 'Erro inesperado ao carregar equipes', error);
    throw error;
  }
}

export async function getUserTeamStatus(email: string): Promise<{ exists: boolean; municipio: string | null }> {
  if (shouldUseBackendTeamsApi()) {
    return getUserTeamStatusViaBackendApi(email);
  }

  const normalizedEmail = normalizeEmail(email);
  return findTeamStatusByEmail(normalizedEmail);
}

export async function saveUserMunicipality(
  microregiaoId: string,
  email: string,
  municipio: string,
  userName: string
): Promise<void> {
  try {
    if (shouldUseBackendTeamsApi()) {
      await saveUserMunicipalityViaBackendApi({
        microregiaoId,
        email,
        municipio,
        userName,
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    let targetProfileId: string | null = null;

    try {
      targetProfileId = await findProfileIdByEmail(normalizedEmail);
    } catch (targetProfileError) {
      logWarn(
        'teamsService',
        'Erro ao buscar profile por email para vincular team',
        targetProfileError
      );
    }

    try {
      await updateProfileMunicipalityByEmail(normalizedEmail, municipio);
    } catch (profileError) {
      logError('teamsService', 'Erro ao atualizar municipio no profile', profileError);
    }

    const existingIds = await listTeamIdsByEmail(normalizedEmail);

    if (existingIds.length > 0) {
      const updatePayload: {
        municipio: string;
        name: string;
        profile_id?: string | null;
      } = {
        municipio,
        name: userName,
      };

      if (targetProfileId) {
        updatePayload.profile_id = targetProfileId;
      }

      await updateTeamRecordsByIds(existingIds, updatePayload);
    } else {
      await insertTeamRecord({
        microregiao_id: microregiaoId,
        name: userName,
        email: normalizedEmail,
        municipio,
        cargo: 'Membro',
        profile_id: targetProfileId,
      });
    }
  } catch (error) {
    logError('teamsService', 'Erro ao salvar municipio do usuario', error);
    throw error;
  }
}

export async function addTeamMember(input: {
  microregiaoId: string;
  name: string;
  role: string;
  email?: string;
  municipio?: string;
}): Promise<TeamMember> {
  try {
    if (shouldUseBackendTeamsApi()) {
      return await addTeamMemberViaBackendApi(input);
    }

    const data = await insertTeamRecord({
      microregiao_id: input.microregiaoId,
      name: input.name,
      cargo: input.role,
      email: input.email || null,
      municipio: input.municipio || null,
    });

    const newMember = mapTeamDTOToTeamMember(data);

    if (input.email) {
      const normalizedEmail = normalizeEmail(input.email);
      const profileId = await findProfileIdByEmail(normalizedEmail);

      newMember.isRegistered = !!profileId;

      if (!newMember.isRegistered) {
        await notifyAdminsOfPendingUser(input.name, normalizedEmail, input.microregiaoId);
      }
    } else {
      newMember.isRegistered = false;
    }

    const microName = await fetchMicroNameById(input.microregiaoId);
    await recordAutomatedEvent({
      type: 'new_user',
      municipality: microName,
      title: `${input.name} se juntou \u00E0 equipe de ${microName}`,
      details: `A equipe cresce. Mais um colaborador engajado na transforma\u00E7\u00E3o digital da sa\u00FAde no territ\u00F3rio.`,
      imageGradient: 'from-emerald-600 to-teal-500',
      footerContext: 'Expans\u00E3o da Rede',
    });

    return newMember;
  } catch (error) {
    logError('teamsService', 'Erro inesperado ao adicionar membro', error);
    throw error;
  }
}

export async function removeTeamMember(memberId: string): Promise<void> {
  try {
    if (shouldUseBackendTeamsApi()) {
      await removeTeamMemberViaBackendApi(memberId);
      return;
    }

    await deleteTeamRecord(memberId);
  } catch (error) {
    logError('teamsService', 'Erro inesperado ao remover membro', error);
    throw error;
  }
}

export async function loadPendingRegistrations(): Promise<PendingRegistration[]> {
  try {
    if (shouldUseBackendTeamsApi()) {
      return await loadPendingRegistrationsViaBackendApi();
    }

    return (await listPendingRegistrationRows()).map(mapPendingRegistration);
  } catch (error) {
    logError('teamsService', 'Erro inesperado ao buscar pendentes', error);
    return [];
  }
}

export async function deletePendingRegistration(id: string): Promise<void> {
  try {
    if (shouldUseBackendTeamsApi()) {
      await deletePendingRegistrationViaBackendApi(id);
      return;
    }

    await deletePendingRegistrationRecord(id);
  } catch (error) {
    logError('teamsService', 'Erro ao excluir pendente', error);
    throw new Error('Erro ao excluir membro pendente');
  }
}





