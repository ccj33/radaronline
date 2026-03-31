import type { FastifyRequest } from 'fastify';

import { getSupabaseAdminClient } from '../persistence/supabase-admin.js';
import type { AuthProvider } from './auth.provider.js';
import type { CurrentSession } from './auth.types.js';

type ProfileRow = {
  id: string;
  nome: string | null;
  email: string | null;
  role: 'superadmin' | 'admin' | 'gestor' | 'usuario' | null;
  microregiao_id?: string | null;
  ativo?: boolean | null;
};

export class SupabaseBridgeAuthProvider implements AuthProvider {
  async getCurrentSession(request: FastifyRequest): Promise<CurrentSession> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false };
    }

    const token = authHeader.replace('Bearer ', '');
    const client = getSupabaseAdminClient();

    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) {
      return { authenticated: false };
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, nome, email, role, microregiao_id, ativo')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load authenticated profile');
    }

    const profileRow = (profile as ProfileRow | null) ?? null;
    if (profileRow?.ativo === false) {
      return { authenticated: false };
    }

    const rawMicroregionId = profileRow?.microregiao_id || null;
    const microregionIds = rawMicroregionId
      ? rawMicroregionId.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const primaryMicroregionId = microregionIds[0] ?? null;

    return {
      authenticated: true,
      user: {
        id: authData.user.id,
        email: profileRow?.email || authData.user.email || '',
        name:
          profileRow?.nome ||
          String(authData.user.user_metadata?.name || authData.user.email || 'Usuario'),
        role: profileRow?.role || 'usuario',
        microregionId: primaryMicroregionId,
        microregionIds,
      },
    };
  }
}
