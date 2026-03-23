import { logWarn } from '../../lib/logger';
import type { ProfileDTO, UserRole } from '../../types/auth.types';
import { getPlatformClient } from '../platformClient';
import {
  AUTH_PROFILE_RETRY_COUNT,
  AUTH_PROFILE_RETRY_DELAY_MS,
  AUTH_PROFILE_SELECT,
} from './authService.constants';

const platformClient = getPlatformClient;

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchProfileRecordById(
  userId: string,
  options: { allowMissing?: boolean } = {}
): Promise<ProfileDTO | null> {
  const query = platformClient()
    .from('profiles')
    .select(AUTH_PROFILE_SELECT)
    .eq('id', userId);

  const result = options.allowMissing ? await query.maybeSingle() : await query.single();

  if (result.error) {
    throw new Error(result.error.message || 'Falha ao carregar perfil');
  }

  return (result.data as ProfileDTO | null) ?? null;
}

export async function listProfileRecords(): Promise<ProfileDTO[]> {
  const { data, error } = await platformClient()
    .from('profiles')
    .select(AUTH_PROFILE_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Falha ao listar perfis');
  }

  return (data as unknown as ProfileDTO[] | null) || [];
}

export async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await platformClient()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Falha ao carregar permissao');
  }

  return (data?.role as UserRole | undefined) ?? null;
}

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data, error } = await platformClient()
    .from('profiles')
    .select('nome')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Falha ao carregar nome do usuario');
  }

  return data?.nome || null;
}

export async function updateProfileRecord(
  userId: string,
  updates: Record<string, unknown>,
  options: { selectUpdated?: boolean } = {}
): Promise<ProfileDTO | null> {
  const query = platformClient().from('profiles').update(updates).eq('id', userId);

  if (!options.selectUpdated) {
    const { error } = await query;
    if (error) {
      throw new Error(error.message || 'Falha ao atualizar perfil');
    }
    return null;
  }

  const { data, error } = await query.select(AUTH_PROFILE_SELECT).single();

  if (error) {
    throw new Error(error.message || 'Falha ao atualizar perfil');
  }

  return (data as unknown as ProfileDTO | null) ?? null;
}

export async function fetchCreatedProfileWithRetry(userId: string): Promise<ProfileDTO> {
  let lastErrorMessage: string | undefined;

  for (let attempt = 0; attempt < AUTH_PROFILE_RETRY_COUNT; attempt += 1) {
    const { data, error } = await platformClient()
      .from('profiles')
      .select(AUTH_PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return data as unknown as ProfileDTO;
    }

    lastErrorMessage = error?.message;

    if (attempt < AUTH_PROFILE_RETRY_COUNT - 1) {
      logWarn('authService', `Retry ${attempt + 1}/${AUTH_PROFILE_RETRY_COUNT} ao buscar perfil`, {
        message: error?.message,
      });
      await delay(AUTH_PROFILE_RETRY_DELAY_MS);
    }
  }

  throw new Error(
    lastErrorMessage ||
      'Perfil nao foi criado pelo trigger. Verifique se o trigger esta ativo no provider.'
  );
}

export async function upsertFirstAccessTeamMembership(args: {
  userId: string;
  userEmail: string;
  municipio: string;
  microregiaoId: string;
}): Promise<void> {
  const { data: existingTeam, error: existingTeamError } = await platformClient()
    .from('teams')
    .select('id')
    .eq('email', args.userEmail)
    .eq('microregiao_id', args.microregiaoId)
    .maybeSingle();

  if (existingTeamError) {
    logWarn('authService', 'Erro ao buscar time existente no primeiro acesso', existingTeamError);
  }

  if (existingTeam) {
    const { error: updateTeamError } = await platformClient()
      .from('teams')
      .update({
        municipio: args.municipio,
        profile_id: args.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingTeam.id);

    if (updateTeamError) {
      logWarn('authService', 'Erro ao atualizar municipio no teams', updateTeamError);
    }

    return;
  }

  const profileName = await fetchProfileName(args.userId);

  const { error: insertTeamError } = await platformClient()
    .from('teams')
    .insert({
      name: profileName || 'Usuario',
      email: args.userEmail,
      microregiao_id: args.microregiaoId,
      municipio: args.municipio,
      cargo: 'Membro',
      profile_id: args.userId,
    });

  if (insertTeamError) {
    logWarn('authService', 'Erro ao criar registro no teams', insertTeamError);
  }
}
