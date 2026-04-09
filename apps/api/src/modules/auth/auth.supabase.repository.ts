import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type { AuthProfile, AuthProfileRepository, CompleteFirstAccessInput } from './auth.repository.js';

type TeamRow = {
  id: string;
};

type ProfileRow = {
  id: string;
  nome: string | null;
  email: string | null;
  role: 'superadmin' | 'admin' | 'gestor' | 'usuario' | null;
  microregiao_id: string | null;
  ativo: boolean | null;
  lgpd_consentimento: boolean | null;
  lgpd_consentimento_data: string | null;
  avatar_id: string | null;
  municipio: string | null;
  first_access: boolean | null;
  created_at: string | null;
};

export class SupabaseAuthProfileRepository implements AuthProfileRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async getProfile(userId: string): Promise<AuthProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select(
        'id, nome, email, role, microregiao_id, ativo, lgpd_consentimento, lgpd_consentimento_data, avatar_id, municipio, first_access, created_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to load authenticated profile');
    }

    const profile = (data as ProfileRow | null) ?? null;
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email || '',
      name: profile.nome || 'Usuario',
      role: profile.role || 'usuario',
      microregionId: profile.microregiao_id,
      active: profile.ativo !== false,
      lgpdAccepted: profile.lgpd_consentimento === true,
      lgpdAcceptedAt: profile.lgpd_consentimento_data,
      avatarId: profile.avatar_id,
      municipality: profile.municipio,
      firstAccess: profile.first_access !== false,
      createdAt: profile.created_at || new Date().toISOString(),
    };
  }

  async acceptLgpd(userId: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        lgpd_consentimento: true,
        lgpd_consentimento_data: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to accept LGPD');
    }
  }

  async completeFirstAccess(input: CompleteFirstAccessInput): Promise<void> {
    const normalizedPassword = input.newPassword.trim();
    if (normalizedPassword.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const normalizedMunicipio = input.municipio.trim();
    if (!normalizedMunicipio) {
      throw new Error('MUNICIPALITY_REQUIRED');
    }

    const { error: passwordError } = await this.client.auth.admin.updateUserById(input.userId, {
      password: normalizedPassword,
    });
    if (passwordError) {
      throw new Error(passwordError.message || 'Failed to update password');
    }

    const skipTeamUpsert = input.microregionId === 'all';

    if (!skipTeamUpsert) {
      const { data: existingTeam, error: existingTeamError } = await this.client
        .from('teams')
        .select('id')
        .eq('email', input.userEmail)
        .eq('microregiao_id', input.microregionId)
        .maybeSingle();

      if (existingTeamError) {
        throw new Error(existingTeamError.message || 'Failed to query first access team');
      }

      if (existingTeam) {
        const { error: updateTeamError } = await this.client
          .from('teams')
          .update({
            municipio: normalizedMunicipio,
            profile_id: input.userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existingTeam as TeamRow).id);

        if (updateTeamError) {
          throw new Error(updateTeamError.message || 'Failed to update first access team');
        }
      } else {
        const { data: profileNameData, error: profileNameError } = await this.client
          .from('profiles')
          .select('nome')
          .eq('id', input.userId)
          .maybeSingle();

        if (profileNameError) {
          throw new Error(profileNameError.message || 'Failed to load profile name');
        }

        const { error: insertTeamError } = await this.client.from('teams').insert({
          name: (profileNameData as { nome?: string } | null)?.nome || 'Usuario',
          email: input.userEmail,
          microregiao_id: input.microregionId,
          municipio: normalizedMunicipio,
          cargo: 'Membro',
          profile_id: input.userId,
        });

        if (insertTeamError) {
          throw new Error(insertTeamError.message || 'Failed to create first access team');
        }
      }
    }

    const { error: updateProfileError } = await this.client
      .from('profiles')
      .update({
        first_access: false,
        municipio: normalizedMunicipio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.userId);

    if (updateProfileError) {
      throw new Error(updateProfileError.message || 'Failed to update first access profile');
    }
  }
}
