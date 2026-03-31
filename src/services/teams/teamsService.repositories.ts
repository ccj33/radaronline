import { MICROREGIOES } from '../../data/microregioes';
import { getPlatformClient } from '../platformClient';
import type {
  PendingRegistrationRow,
  TeamDTO,
  TeamInsertInput,
  TeamProfileRow,
  TeamUpdateInput,
} from './teamsService.types';

const platformClient = getPlatformClient;
const PROFILE_FIELDS = 'id, nome, email, municipio, microregiao_id, role';
const TEAM_FIELDS =
  'id, microregiao_id, name, cargo, email, municipio, profile_id, created_at, updated_at';
const PENDING_REGISTRATION_FIELDS = 'id, name, email, municipio, microregiao_id, cargo, created_at';

export async function fetchMicroNameById(id: string): Promise<string> {
  const { data, error } = await platformClient()
    .from('microregioes')
    .select('nome')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message || 'Falha ao carregar nome da microrregiao');
  }

  return data?.nome || MICROREGIOES.find((m) => m.id === id)?.nome || id;
}

export async function listAdminIds(): Promise<string[]> {
  const { data, error } = await platformClient()
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'superadmin']);

  if (error) {
    throw new Error(error.message || 'Falha ao carregar administradores');
  }

  return ((data || []) as Array<{ id: string }>).map((admin) => admin.id);
}

export async function listActiveProfiles(microregiaoId?: string): Promise<TeamProfileRow[]> {
  let query = platformClient()
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('ativo', true);

  if (microregiaoId && microregiaoId !== 'all') {
    query = query.eq('microregiao_id', microregiaoId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data as TeamProfileRow[] | null) || [];
}

export async function listTeamRecords(microregiaoId?: string): Promise<TeamDTO[]> {
  let query = platformClient()
    .from('teams')
    .select(TEAM_FIELDS)
    .order('name', { ascending: true });

  if (microregiaoId && microregiaoId !== 'all') {
    query = query.eq('microregiao_id', microregiaoId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Falha ao carregar equipes');
  }

  return (data as TeamDTO[] | null) || [];
}

export async function findTeamStatusByEmail(
  normalizedEmail: string
): Promise<{ exists: boolean; municipio: string | null }> {
  const { data, error } = await platformClient()
    .from('teams')
    .select('municipio')
    .eq('email', normalizedEmail)
    .limit(1);

  if (error) {
    throw new Error(error.message || 'Falha ao buscar municipio do time');
  }

  const record = data?.[0];
  return {
    exists: !!record,
    municipio: record?.municipio || null,
  };
}

export async function findProfileIdByEmail(normalizedEmail: string): Promise<string | null> {
  const { data, error } = await platformClient()
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id || null;
}

export async function updateProfileMunicipalityByEmail(
  normalizedEmail: string,
  municipio: string
): Promise<void> {
  const { error } = await platformClient()
    .from('profiles')
    .update({ municipio })
    .eq('email', normalizedEmail);

  if (error) {
    throw error;
  }
}

export async function listTeamIdsByEmail(normalizedEmail: string): Promise<string[]> {
  const { data, error } = await platformClient()
    .from('teams')
    .select('id')
    .eq('email', normalizedEmail);

  if (error) {
    throw new Error(error.message || 'Falha ao carregar membros da equipe');
  }

  return ((data || []) as Array<{ id: string }>).map((team) => team.id);
}

export async function updateTeamRecordsByIds(
  ids: string[],
  payload: TeamUpdateInput
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const { error } = await platformClient()
    .from('teams')
    .update(payload)
    .in('id', ids);

  if (error) {
    throw new Error(error.message || 'Falha ao atualizar equipe');
  }
}

export async function insertTeamRecord(input: TeamInsertInput): Promise<TeamDTO> {
  const { data, error } = await platformClient()
    .from('teams')
    .insert(input)
    .select(TEAM_FIELDS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Falha ao adicionar membro');
  }

  return data as TeamDTO;
}

export async function deleteTeamRecord(memberId: string): Promise<void> {
  const { error } = await platformClient()
    .from('teams')
    .delete()
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message || 'Falha ao remover membro');
  }
}

export async function listPendingRegistrationRows(): Promise<PendingRegistrationRow[]> {
  const { data, error } = await platformClient()
    .from('teams')
    .select(PENDING_REGISTRATION_FIELDS)
    .is('profile_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Falha ao buscar pendentes');
  }

  return (data as PendingRegistrationRow[] | null) || [];
}

export async function deletePendingRegistrationRecord(id: string): Promise<void> {
  const { error } = await platformClient()
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Falha ao excluir pendente');
  }
}
