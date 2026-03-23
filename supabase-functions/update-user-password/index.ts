// supabase/functions/update-user-password/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// =====================================
// CONSTANTES
// =====================================
const MIN_PASSWORD_LENGTH = 6;
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
const INCLUDE_DEBUG_ERRORS = (Deno.env.get('EDGE_DEBUG_ERRORS') || '').toLowerCase() === 'true';

const errorResponse = (message: string, status: number, origin: string | null, debug?: any) => new Response(
    JSON.stringify(
        INCLUDE_DEBUG_ERRORS && debug !== undefined
            ? { error: message, debug }
            : { error: message }
    ),
    { status, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
);

const successResponse = (data: any, origin: string | null) => new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
);

// =====================================
// VERIFICAÇÕES DE SEGURANÇA
// =====================================
const checkIsAdminOrSuperadmin = async (
    supabaseAdmin: any,
    userId: string
): Promise<{ isAdmin: boolean; role: string | null; error: any }> => {
    console.log('[checkIsAdminOrSuperadmin] Buscando role para userId:', userId);
    
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    console.log('[checkIsAdminOrSuperadmin] Resultado:', { profile, error });

    if (error || !profile) {
        return { isAdmin: false, role: null, error };
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';
    return { isAdmin, role: profile.role, error: null };
};

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
            console.log('[update-user-password] Erro ao obter usuário:', userError);
            return errorResponse('Não autenticado', 401, origin);
        }

        console.log('[update-user-password] Usuário autenticado:', currentUser.id, currentUser.email);

        // ✅ Verificar se é admin ou superadmin (com debug info)
        const { isAdmin, role, error: roleError } = await checkIsAdminOrSuperadmin(supabaseAdmin, currentUser.id);
        
        console.log('[update-user-password] Verificação de role:', { isAdmin, role, roleError });

        if (!isAdmin) {
            return errorResponse(
                'Apenas administradores podem alterar senhas de outros usuários', 
                403, 
                origin,
                { 
                    userId: currentUser.id,
                    email: currentUser.email,
                    roleEncontrado: role,
                    roleError: roleError?.message || null,
                    rolesAceitos: ['admin', 'superadmin']
                }
            );
        }

        // ✅ Parse body
        let body;
        try {
            body = await req.json();
        } catch (error: any) {
            console.error('[update-user-password] Erro ao parsear body:', error);
            return errorResponse('Dados inválidos', 400, origin);
        }

        const { userId, password } = body;

        // ✅ Validar campos
        if (!userId) {
            return errorResponse('ID do usuário é obrigatório', 400, origin);
        }

        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            return errorResponse(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`, 400, origin);
        }

        // ✅ PROTEÇÃO SUPERADMIN: Verificar se está tentando alterar senha de superadmin
        const targetIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, userId);

        if (targetIsSuperadmin && currentUser.id !== userId) {
            return errorResponse('Não é possível alterar a senha do Super Admin. Apenas ele mesmo pode alterá-la.', 403, origin);
        }

        // ✅ Log da operação
        console.log('[update-user-password] Atualizando senha para userId:', userId, 'por:', currentUser.id);

        // ✅ Atualizar senha via Admin API
        const { data: _updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (updateError) {
            console.error('[update-user-password] Erro ao atualizar senha:', updateError);
            return errorResponse(updateError.message || 'Erro ao atualizar senha', 500, origin);
        }

        console.log('[update-user-password] Senha atualizada com sucesso para:', userId);

        return successResponse({
            success: true,
            message: 'Senha atualizada com sucesso'
        }, origin);

    } catch (error: any) {
        console.error('[update-user-password] Erro inesperado:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });

        return errorResponse(error.message || 'Erro inesperado', 500, null);
    }
});
