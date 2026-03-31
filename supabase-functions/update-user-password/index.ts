import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

const MIN_PASSWORD_LENGTH = 6;
const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGIN') || 'https://radar-ses-mg.vercel.app'
).split(',');

type ActorRole = 'admin' | 'superadmin';
type ManagedRole = ActorRole | 'gestor' | 'usuario';

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

const loadProfileRole = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<ManagedRole | null> => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile.role as ManagedRole;
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

    const actorRole = await loadProfileRole(supabaseAdmin, currentUser.id);
    if (actorRole !== 'admin' && actorRole !== 'superadmin') {
      return errorResponse(
        'Apenas administradores podem alterar senhas de outros usuarios',
        403,
        origin
      );
    }

    const body = (await req.json()) as { userId?: string; password?: string };
    const userId = body.userId?.trim();
    const password = body.password ? String(body.password) : '';

    if (!userId) {
      return errorResponse('ID do usuario e obrigatorio', 400, origin);
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return errorResponse(`Senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres`, 400, origin);
    }

    const targetRole = await loadProfileRole(supabaseAdmin, userId);

    if (targetRole === 'superadmin' && currentUser.id !== userId) {
      return errorResponse(
        'Nao e possivel alterar a senha do Super Admin. Apenas ele mesmo pode altera-la.',
        403,
        origin
      );
    }

    if (targetRole === 'admin' && actorRole !== 'superadmin') {
      return errorResponse('Apenas o Super Admin pode alterar a senha de administradores.', 403, origin);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

    if (updateError) {
      console.error('[update-user-password] erro ao atualizar senha', updateError);
      return errorResponse(updateError.message || 'Erro ao atualizar senha', 500, origin);
    }

    return successResponse(
      {
        success: true,
        message: 'Senha atualizada com sucesso',
      },
      origin
    );
  } catch (error) {
    console.error('[update-user-password] erro inesperado', error);
    const message = error instanceof Error ? error.message : 'Erro inesperado';
    return errorResponse(message, 500, origin);
  }
});
