import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type { TeamsRepository } from './teams.repository.js';
import type {
  CreateTeamMemberInput,
  PendingRegistrationRecord,
  SaveUserMunicipalityInput,
  TeamMemberRecord,
} from './teams.types.js';

type TeamRow = {
  id: string;
  microregiao_id: string;
  name: string;
  cargo: string;
  email: string | null;
  municipio: string | null;
  profile_id: string | null;
};

type ProfileRow = {
  id: string;
  nome: string;
  email: string | null;
  municipio: string | null;
  microregiao_id: string | null;
  role: string | null;
};

type PendingRow = {
  id: string;
  name: string;
  email: string | null;
  municipio: string | null;
  microregiao_id: string;
  cargo: string | null;
  created_at: string;
};

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function mapTeamRow(row: TeamRow): TeamMemberRecord {
  return {
    id: row.id,
    microregionId: row.microregiao_id,
    name: row.name,
    role: row.cargo,
    email: row.email || '',
    municipality: row.municipio || 'Sede/Remoto',
    isRegistered: !!row.profile_id,
  };
}

function mapPendingRow(row: PendingRow): PendingRegistrationRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    municipality: row.municipio,
    microregionId: row.microregiao_id,
    role: row.cargo || 'Membro',
    createdAt: row.created_at,
  };
}

function mergeProfilesAndTeams(profiles: ProfileRow[], teams: TeamRow[]): Record<string, TeamMemberRecord[]> {
  const grouped: Record<string, TeamMemberRecord[]> = {};
  const teamByEmail = new Map<string, TeamRow>();
  const registeredEmailsByMicro = new Map<string, Set<string>>();
  const registeredProfileEmails = new Set<string>();

  teams.forEach((team) => {
    const email = normalizeEmail(team.email);
    if (email && !teamByEmail.has(email)) {
      teamByEmail.set(email, team);
    }
  });

  profiles.forEach((profile) => {
    const email = normalizeEmail(profile.email);
    const team = email ? teamByEmail.get(email) : undefined;
    const microId = profile.microregiao_id || 'unassigned';
    const member: TeamMemberRecord = {
      id: profile.id,
      microregionId: microId,
      name: profile.nome,
      role: profile.role || 'Membro',
      email: profile.email || '',
      municipality: team?.municipio || profile.municipio || 'Sede/Remoto',
      isRegistered: true,
    };

    grouped[microId] ||= [];
    grouped[microId].push(member);

    if (email) {
      registeredProfileEmails.add(email);
      registeredEmailsByMicro.set(
        microId,
        new Set([...(registeredEmailsByMicro.get(microId) || new Set<string>()), email])
      );
    }
  });

  teams.forEach((team) => {
    const email = normalizeEmail(team.email);
    const exists = !!email && registeredEmailsByMicro.get(team.microregiao_id)?.has(email);
    if (exists) {
      return;
    }

    const member = mapTeamRow(team);
    member.isRegistered = !!email && registeredProfileEmails.has(email);
    grouped[team.microregiao_id] ||= [];
    grouped[team.microregiao_id].push(member);
  });

  return grouped;
}

export class SupabaseTeamsRepository implements TeamsRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async listTeams(microregionId?: string): Promise<Record<string, TeamMemberRecord[]>> {
    let profilesQuery = this.client
      .from('profiles')
      .select('id, nome, email, municipio, microregiao_id, role')
      .eq('ativo', true);

    let teamsQuery = this.client
      .from('teams')
      .select('id, microregiao_id, name, cargo, email, municipio, profile_id')
      .order('name', { ascending: true });

    if (microregionId && microregionId !== 'all') {
      profilesQuery = profilesQuery.eq('microregiao_id', microregionId);
      teamsQuery = teamsQuery.eq('microregiao_id', microregionId);
    }

    const [{ data: profiles, error: profilesError }, { data: teams, error: teamsError }] =
      await Promise.all([profilesQuery, teamsQuery]);

    if (profilesError) {
      throw new Error(profilesError.message || 'Failed to load active profiles');
    }
    if (teamsError) {
      throw new Error(teamsError.message || 'Failed to load teams');
    }

    return mergeProfilesAndTeams((profiles as ProfileRow[] | null) || [], (teams as TeamRow[] | null) || []);
  }

  async getUserTeamStatus(
    email: string,
    microregionId?: string
  ): Promise<{ exists: boolean; municipality: string | null }> {
    const normalized = normalizeEmail(email);
    let query = this.client
      .from('teams')
      .select('municipio')
      .eq('email', normalized)
      .limit(1);

    if (microregionId && microregionId !== 'all') {
      query = query.eq('microregiao_id', microregionId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to load team status');
    }

    const record = data?.[0] as { municipio?: string | null } | undefined;
    return {
      exists: !!record,
      municipality: record?.municipio || null,
    };
  }

  async getTeamMemberById(memberId: string): Promise<TeamMemberRecord | null> {
    const { data: teamData, error: teamError } = await this.client
      .from('teams')
      .select('id, microregiao_id, name, cargo, email, municipio, profile_id')
      .eq('id', memberId)
      .maybeSingle();

    if (teamError) {
      throw new Error(teamError.message || 'Failed to load team member');
    }

    if (teamData) {
      return mapTeamRow(teamData as TeamRow);
    }

    const { data: profileData, error: profileError } = await this.client
      .from('profiles')
      .select('id, nome, email, municipio, microregiao_id, role')
      .eq('id', memberId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load profile team member');
    }

    const profile = profileData as ProfileRow | null;
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      microregionId: profile.microregiao_id || 'unassigned',
      name: profile.nome,
      role: profile.role || 'Membro',
      email: profile.email || '',
      municipality: profile.municipio || 'Sede/Remoto',
      isRegistered: true,
    };
  }

  async getPendingRegistrationById(id: string): Promise<PendingRegistrationRecord | null> {
    const { data, error } = await this.client
      .from('teams')
      .select('id, name, email, municipio, microregiao_id, cargo, created_at')
      .eq('id', id)
      .is('profile_id', null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load pending registration');
    }

    return data ? mapPendingRow(data as PendingRow) : null;
  }

  async saveUserMunicipality(input: SaveUserMunicipalityInput): Promise<void> {
    const normalizedEmail = normalizeEmail(input.email);

    await this.client
      .from('profiles')
      .update({ municipio: input.municipality })
      .eq('email', normalizedEmail);

    const { data: existingTeams, error: existingTeamsError } = await this.client
      .from('teams')
      .select('id')
      .eq('email', normalizedEmail);

    if (existingTeamsError) {
      throw new Error(existingTeamsError.message || 'Failed to load existing team members');
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load profile id');
    }

    const profileId = (profile as { id?: string } | null)?.id || null;
    const ids = ((existingTeams || []) as Array<{ id: string }>).map((row) => row.id);

    if (ids.length > 0) {
      const { error } = await this.client
        .from('teams')
        .update({
          municipio: input.municipality,
          name: input.userName,
          ...(profileId ? { profile_id: profileId } : {}),
        })
        .in('id', ids);

      if (error) {
        throw new Error(error.message || 'Failed to update team municipality');
      }

      return;
    }

    const { error } = await this.client.from('teams').insert({
      microregiao_id: input.microregionId,
      name: input.userName,
      cargo: 'Membro',
      email: normalizedEmail,
      municipio: input.municipality,
      profile_id: profileId,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create municipality team member');
    }
  }

  async addTeamMember(input: CreateTeamMemberInput): Promise<TeamMemberRecord> {
    const normalizedEmail = normalizeEmail(input.email);
    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load profile by email');
    }

    const profileId = (profile as { id?: string } | null)?.id || null;
    const { data, error } = await this.client
      .from('teams')
      .insert({
        microregiao_id: input.microregionId,
        name: input.name,
        cargo: input.role,
        email: normalizedEmail || null,
        municipio: input.municipality?.trim() || null,
        profile_id: profileId,
      })
      .select('id, microregiao_id, name, cargo, email, municipio, profile_id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create team member');
    }

    if (!profileId && normalizedEmail) {
      const { data: admins, error: adminsError } = await this.client
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      if (!adminsError) {
        const notifications = ((admins || []) as Array<{ id: string }>).map((admin) => ({
          user_id: admin.id,
          request_type: 'system',
          content: `Membro pendente de cadastro: ${input.name} (${normalizedEmail}) na Micro ${input.microregionId}. Necessario criar conta.`,
          status: 'pending',
        }));

        if (notifications.length > 0) {
          await this.client.from('user_requests').insert(notifications);
        }
      }
    }

    return mapTeamRow(data as TeamRow);
  }

  async removeTeamMember(memberId: string): Promise<void> {
    const { data, error } = await this.client
      .from('teams')
      .delete()
      .eq('id', memberId)
      .select('id')
      .maybeSingle();
    if (error) {
      throw new Error(error.message || 'Failed to remove team member');
    }
    if (!data) {
      throw new Error('NOT_FOUND');
    }
  }

  async listPendingRegistrations(): Promise<PendingRegistrationRecord[]> {
    const { data, error } = await this.client
      .from('teams')
      .select('id, name, email, municipio, microregiao_id, cargo, created_at')
      .is('profile_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to load pending registrations');
    }

    return ((data as PendingRow[] | null) || []).map(mapPendingRow);
  }

  async deletePendingRegistration(id: string): Promise<void> {
    const { data, error } = await this.client
      .from('teams')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) {
      throw new Error(error.message || 'Failed to delete pending registration');
    }
    if (!data) {
      throw new Error('NOT_FOUND');
    }
  }
}
