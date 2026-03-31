// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// =====================================
// CONSTANTES
// =====================================
const _REQUEST_TIMEOUT_MS = 30000;

// CORS Headers - Configurar ALLOWED_ORIGIN no Supabase Dashboard > Edge Functions > Secrets
// ⚠️ SEGURANÇA: Suporta múltiplas origens separadas por vírgula
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || 'https://radar-ses-mg.vercel.app').split(',');

// Função para obter headers CORS baseado na origem da requisição
const getCorsHeaders = (origin: string | null) => {
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
    };
};

// =====================================
// HELPERS
// =====================================
const errorResponse = (message: string, status: number, origin: string | null) => new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
);

const successResponse = (data: any, origin: string | null) => new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
);

// =====================================
// VERIFICAÇÕES DE SEGURANÇA
// =====================================
const checkIsSuperadmin = async (
    supabaseAdmin: any,
    userId: string
): Promise<boolean> => {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        return false;
    }

    return profile.role === 'superadmin';
};

// =====================================
// HANDLER PRINCIPAL
// =====================================
serve(async (req: Request) => {
    // Obter origem da requisição para CORS dinâmico
    const origin = req.headers.get('origin');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(origin) });
    }

    try {
        // ✅ Validar autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return errorResponse('Não autenticado', 401, origin);
        }
        const token = authHeader.replace('Bearer ', '');

        // ✅ Cliente Admin (usa service_role key)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ✅ Obter usuário atual pelo token
        const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !currentUser) {
            return errorResponse('Não autenticado', 401, origin);
        }

        // ✅ APENAS SUPERADMIN pode excluir usuários
        const callerIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, currentUser.id);
        if (!callerIsSuperadmin) {
            return errorResponse('Apenas o Super Admin pode excluir usuários permanentemente', 403, origin);
        }

        // ✅ Parse body
        let body;
        try {
            body = await req.json();
        } catch (error: any) {
            console.error('[delete-user] Erro ao parsear body:', error);
            return errorResponse('Dados inválidos', 400, origin);
        }

        const { userId } = body;

        // ✅ Validar campos
        if (!userId) {
            return errorResponse('ID do usuário é obrigatório', 400, origin);
        }

        // ✅ Não permitir auto-exclusão
        if (userId === currentUser.id) {
            return errorResponse('Você não pode excluir a si mesmo', 400, origin);
        }

        // ✅ PROTEÇÃO: Não permitir excluir outro superadmin
        const targetIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, userId);
        if (targetIsSuperadmin) {
            return errorResponse('Não é possível excluir o Super Admin', 403, origin);
        }

        console.info('[delete-user] exclusão administrativa autorizada', {
            actorId: currentUser.id,
            targetUserId: userId,
        });

        // ✅ Excluir profile primeiro (cascade deve cuidar de relacionamentos)
        const { error: profileDeleteError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileDeleteError) {
            console.error('[delete-user] Erro ao excluir profile:', profileDeleteError);
            // Continuar mesmo assim - pode ser que não exista profile
        }

        // ✅ Excluir usuário do Auth via Admin API
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error('[delete-user] Erro ao excluir do Auth:', authDeleteError);
            return errorResponse(authDeleteError.message || 'Erro ao excluir usuário', 500, origin);
        }

        return successResponse({
            success: true,
            message: 'Usuário excluído permanentemente'
        }, origin);

    } catch (error: any) {
        console.error('[delete-user] Erro inesperado:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });

        return errorResponse(error.message || 'Erro inesperado', 500, null);
    }
});
