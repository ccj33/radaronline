import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

const VALID_ROLES = ['admin', 'superadmin', 'gestor', 'usuario'] as const;
const MIN_PASSWORD_LENGTH = 6;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 30000;

const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGIN') || 'https://radar-ses-mg.vercel.app'
).split(',');

type ActorRole = 'admin' | 'superadmin';
type ManagedRole = (typeof VALID_ROLES)[number];

interface ValidatedInput {
  email: string;
  password: string;
  nome: string;
  role: ManagedRole;
  microregiao_id: string | null;
  created_by: string;
}

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

const errorResponse = (message: string, status: number, origin: string | null) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });

const successResponse = (data: unknown, origin: string | null) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });

const sanitizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const canAssignRole = (actorRole: ActorRole, targetRole: ManagedRole): boolean => {
  if (actorRole === 'superadmin') {
    return true;
  }

  return targetRole === 'gestor' || targetRole === 'usuario';
};

const validateAndSanitizeInputs = (body: unknown, currentUserId: string): ValidatedInput => {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const email = sanitizeString(payload.email);
  const password = payload.password ? String(payload.password) : '';
  const nome = sanitizeString(payload.nome);
  const role = payload.role ? String(payload.role) : '';
  const microregiaoId = payload.microregiaoId ? sanitizeString(payload.microregiaoId) : '';

  if (!email) {
    throw new Error('Email e obrigatorio');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.toLowerCase())) {
    throw new Error('Formato de email invalido');
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  if (!nome) {
    throw new Error('Nome e obrigatorio');
  }

  if (!role || !VALID_ROLES.includes(role as ManagedRole)) {
    throw new Error(`Role invalido. Use: ${VALID_ROLES.join(', ')}`);
  }

  let normalizedMicroregionId: string | null = null;
  if (role !== 'admin' && role !== 'superadmin' && microregiaoId !== 'all') {
    if (!microregiaoId) {
      throw new Error('Microrregiao e obrigatoria para usuarios nao-admin');
    }

    normalizedMicroregionId = microregiaoId;
  }

  return {
    email: email.toLowerCase(),
    password,
    nome,
    role: role as ManagedRole,
    microregiao_id: normalizedMicroregionId,
    created_by: currentUserId,
  };
};

const checkActorRole = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<ActorRole | null> => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile.role === 'admin' || profile.role === 'superadmin' ? profile.role : null;
};

const insertProfileWithRetry = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  profileData: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: unknown }> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao inserir perfil')), REQUEST_TIMEOUT_MS);
    });

    const insertPromise = supabaseAdmin.from('profiles').insert([profileData]).select().single();

    try {
      const result = (await Promise.race([insertPromise, timeoutPromise])) as {
        data: Record<string, unknown> | null;
        error: unknown;
      };

      if (result.data && !result.error) {
        return result;
      }

      lastError = result.error;
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  return { data: null, error: lastError };
};

serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Nao autenticado', 401, origin);
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !currentUser) {
      return errorResponse('Nao autenticado', 401, origin);
    }

    const actorRole = await checkActorRole(supabaseAdmin, currentUser.id);
    if (!actorRole) {
      return errorResponse('Apenas administradores podem criar usuarios', 403, origin);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[create-user] body invalido', error);
      return errorResponse('Dados invalidos', 400, origin);
    }

    const validated = validateAndSanitizeInputs(body, currentUser.id);

    if (!canAssignRole(actorRole, validated.role)) {
      if (validated.role === 'superadmin') {
        return errorResponse('Apenas o Super Admin pode criar outro Super Admin', 403, origin);
      }

      return errorResponse('Apenas o Super Admin pode criar administradores', 403, origin);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[create-user] erro ao criar usuario', authError);

      if (
        authError.message?.includes('already registered') ||
        authError.message?.includes('already exists') ||
        authError.message?.includes('ja esta cadastrado')
      ) {
        return errorResponse('Este email ja esta cadastrado', 400, origin);
      }

      return errorResponse(authError.message || 'Erro ao criar usuario', 500, origin);
    }

    const randomAvatarId = `zg${Math.floor(Math.random() * 16) + 1}`;
    const profileData = {
      id: authData.user.id,
      nome: validated.nome,
      email: validated.email,
      role: validated.role,
      microregiao_id: validated.microregiao_id,
      created_by: validated.created_by,
      ativo: true,
      lgpd_consentimento: false,
      avatar_id: randomAvatarId,
    };

    const { data: newProfile, error: profileInsertError } = await insertProfileWithRetry(
      supabaseAdmin,
      profileData
    );

    if (profileInsertError || !newProfile) {
      console.error('[create-user] erro ao inserir perfil', profileInsertError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return errorResponse('Erro ao criar perfil de usuario', 500, origin);
    }

    return successResponse(
      {
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
          },
          profile: newProfile,
        },
      },
      origin
    );
  } catch (error) {
    console.error('[create-user] erro inesperado', error);
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    const status =
      message.includes('invalido') ||
      message.includes('obrigatorio') ||
      message.includes('cadastrado')
        ? 400
        : 500;

    return errorResponse(message, status, origin);
  }
});
