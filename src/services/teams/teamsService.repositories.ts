import { MICROREGIOES } from '../../data/microregioes';
import { getPlatformClient } from '../platformClient';
import { normalizeEmail } from './teamsService.helpers';
import type {
  PendingRegistrationRow,
  TeamDTO,
  TeamInsertInput,
  TeamProfileRow,
  TeamUpdateInput,
} from './teamsService.types';

const platformClient = getPlatformClient;

/** Supabase usa UUID em `microregioes.id`; o app ainda referencia códigos MR### / numéricos vindos de `microregioes.ts`. */
const MICROREGIAO_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_FIELDS = 'id, nome, email, municipio, microregiao_id, role';
const TEAM_FIELDS =
  'id, microregiao_id, name, cargo, email, municipio, profile_id, created_at, updated_at';
const PENDING_REGISTRATION_FIELDS = 'id, name, email, municipio, microregiao_id, cargo, created_at';

export async function fetchMicroNameById(id: string): Promise<string> {
  const staticHit = MICROREGIOES.find((m) => m.id === id || m.codigo === id);
  if (staticHit?.nome) {
    return staticHit.nome;
  }

  const column = MICROREGIAO_UUID_RE.test(id) ? 'id' : 'codigo';
  const { data, error } = await platformClient()
    .from('microregioes')
    .select('nome')
    .eq(column, id)
    .single();

  if (error) {
    throw new Error(error.message || 'Falha ao carregar nome da microrregiao');
  }

  return data?.nome || id;
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

/** Um destinatário para alertas operacionais: evita N linhas iguais em `user_requests`. */
export async function pickPrimaryAdminNotificationRecipientId(): Promise<string | null> {
  const ids = await listAdminIds();
  if (ids.length === 0) {
    return null;
  }
  if (ids.length === 1) {
    return ids[0];
  }

  const { data, error } = await platformClient()
    .from('profiles')
    .select('id, role')
    .in('id', ids);

  if (error || !data || data.length === 0) {
    return ids[0];
  }

  const rows = data as Array<{ id: string; role: string }>;
  const superadmin = rows.find((row) => row.role === 'superadmin');
  return superadmin?.id ?? rows[0].id;
}

export async function hasPendingDuplicateMemberRequestContent(content: string): Promise<boolean> {
  const trimmed = content.trim();
  const { data, error } = await platformClient()
    .from('user_requests')
    .select('id')
    .eq('status', 'pending')
    .eq('request_type', 'request')
    .eq('content', trimmed)
    .limit(1);

  if (error) {
    return false;
  }

  return Boolean(data && data.length > 0);
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

export async function listActiveProfilesByEmails(emails: string[]): Promise<TeamProfileRow[]> {
  const normalized = [...new Set(emails.map((e) => normalizeEmail(e)).filter((e) => e.length > 0))];
  if (normalized.length === 0) {
    return [];
  }

  const { data, error } = await platformClient()
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('ativo', true)
    .in('email', normalized);

  if (error) {
    throw new Error(error.message || 'Falha ao carregar perfis por email');
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

  const pendingRows = (data as PendingRegistrationRow[] | null) || [];
  if (pendingRows.length === 0) {
    return pendingRows;
  }

  const emails = pendingRows
    .map((row) => (row.email || '').trim().toLowerCase())
    .filter((email) => email.length > 0);

  if (emails.length === 0) {
    return pendingRows;
  }

  const uniqueEmails = [...new Set(emails)];
  const { data: profileRows } = await platformClient()
    .from('profiles')
    .select('email')
    .in('email', uniqueEmails);

  if (!profileRows || profileRows.length === 0) {
    return pendingRows;
  }

  const registeredEmails = new Set(
    (profileRows as Array<{ email: string | null }>)
      .map((row) => (row.email || '').trim().toLowerCase())
      .filter((email) => email.length > 0)
  );

  return pendingRows.filter((row) => {
    const email = (row.email || '').trim().toLowerCase();
    return !email || !registeredEmails.has(email);
  });
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
