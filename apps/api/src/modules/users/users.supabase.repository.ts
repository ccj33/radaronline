import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../../shared/persistence/supabase-admin.js';
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UserRecord,
} from './users.types.js';
import type { UsersRepository } from './users.repository.js';

type ProfileRow = {
  id: string;
  email: string;
  nome: string;
  role: UserRecord['role'];
  microregiao_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function mapProfileRow(row: ProfileRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.nome,
    role: row.role,
    microregionId: row.microregiao_id,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createAvatarId() {
  return `zg${Math.floor(Math.random() * 16) + 1}`;
}

export class SupabaseUsersRepository implements UsersRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async list(): Promise<UserRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, email, nome, role, microregiao_id, ativo, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to list users');
    }

    return ((data || []) as ProfileRow[]).map(mapProfileRow);
  }

  async getById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, email, nome, role, microregiao_id, ativo, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to get user');
    }

    return data ? mapProfileRow(data as ProfileRow) : null;
  }

  async getByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, email, nome, role, microregiao_id, ativo, created_at, updated_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to get user by email');
    }

    return data ? mapProfileRow(data as ProfileRow) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const { data: createdUser, error: createUserError } = await this.client.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password: input.password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      throw new Error(createUserError?.message || 'Failed to create auth user');
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .insert({
        id: createdUser.user.id,
        nome: input.name,
        email: input.email.toLowerCase(),
        role: input.role,
        microregiao_id: input.microregionId,
        created_by: input.createdBy,
        ativo: true,
        lgpd_consentimento: false,
        first_access: true,
        avatar_id: createAvatarId(),
      })
      .select('id, email, nome, role, microregiao_id, ativo, created_at, updated_at')
      .single();

    if (profileError || !profile) {
      await this.client.auth.admin.deleteUser(createdUser.user.id);
      throw new Error(profileError?.message || 'Failed to create profile');
    }

    return mapProfileRow(profile as ProfileRow);
  }

  async update(userId: string, input: UpdateUserInput): Promise<UserRecord | null> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) payload.nome = input.name;
    if (input.role !== undefined) payload.role = input.role;
    if (input.microregionId !== undefined) payload.microregiao_id = input.microregionId;
    if (input.active !== undefined) payload.ativo = input.active;

    const { data, error } = await this.client
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, email, nome, role, microregiao_id, ativo, created_at, updated_at')
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Failed to update user');
    }

    return data ? mapProfileRow(data as ProfileRow) : null;
  }

  async delete(userId: string): Promise<boolean> {
    const { data: profile, error: profileReadError } = await this.client
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message || 'Failed to load profile before delete');
    }

    const { error: teamsByProfileError } = await this.client.from('teams').delete().eq('profile_id', userId);
    if (teamsByProfileError) {
      throw new Error(teamsByProfileError.message || 'Failed to delete team rows for user');
    }

    const email = profile?.email?.trim();
    if (email) {
      const { error: teamsByEmailError } = await this.client.from('teams').delete().eq('email', email);
      if (teamsByEmailError) {
        throw new Error(teamsByEmailError.message || 'Failed to delete team rows by email');
      }
    }

    const { error: profileDeleteError } = await this.client.from('profiles').delete().eq('id', userId);
    if (profileDeleteError) {
      throw new Error(profileDeleteError.message || 'Failed to delete profile');
    }

    const { error: userDeleteError } = await this.client.auth.admin.deleteUser(userId);
    if (userDeleteError) {
      throw new Error(userDeleteError.message || 'Failed to delete auth user');
    }

    return true;
  }

  async resetPassword(userId: string, input: ResetPasswordInput): Promise<boolean> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      password: input.password,
    });

    if (error) {
      throw new Error(error.message || 'Failed to reset password');
    }

    return true;
  }
}
