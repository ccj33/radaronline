// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// =====================================
// CONSTANTES
// =====================================
const REQUEST_TIMEOUT_MS = 30000;

// CORS Headers - ALTERE PARA SEU DOMÍNIO EM PRODUÇÃO
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // TODO: Alterar para 'https://seu-dominio.vercel.app'
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =====================================
// HELPERS
// =====================================
const errorResponse = (message: string, status: number) => new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

const successResponse = (data: any) => new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

const getUserProfile = async (
    supabaseAdmin: any,
    userId: string
): Promise<{ nome: string; email: string; role: string } | null> => {
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('nome, email, role')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        return null;
    }

    return profile;
};

// =====================================
// HANDLER PRINCIPAL
// =====================================
serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ✅ Validar autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return errorResponse('Não autenticado', 401);
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
            return errorResponse('Não autenticado', 401);
        }

        // ✅ APENAS SUPERADMIN pode excluir usuários
        const callerIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, currentUser.id);
        if (!callerIsSuperadmin) {
            return errorResponse('Apenas o Super Admin pode excluir usuários permanentemente', 403);
        }

        // ✅ Parse body
        let body;
        try {
            body = await req.json();
        } catch (error: any) {
            console.error('[delete-user] Erro ao parsear body:', error);
            return errorResponse('Dados inválidos', 400);
        }

        const { userId } = body;

        // ✅ Validar campos
        if (!userId) {
            return errorResponse('ID do usuário é obrigatório', 400);
        }

        // ✅ Não permitir auto-exclusão
        if (userId === currentUser.id) {
            return errorResponse('Você não pode excluir a si mesmo', 400);
        }

        // ✅ PROTEÇÃO: Não permitir excluir outro superadmin
        const targetIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, userId);
        if (targetIsSuperadmin) {
            return errorResponse('Não é possível excluir o Super Admin', 403);
        }

        // ✅ Obter dados do usuário antes de excluir (para log)
        const targetProfile = await getUserProfile(supabaseAdmin, userId);

        // ✅ Log da operação
        console.log('[delete-user] Excluindo usuário:', userId, 'por:', currentUser.id);
        console.log('[delete-user] Dados do usuário:', targetProfile);

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
            return errorResponse(authDeleteError.message || 'Erro ao excluir usuário', 500);
        }

        console.log('[delete-user] Usuário excluído com sucesso:', userId);

        // ✅ Registrar atividade
        try {
            await supabaseAdmin.from('activity_logs').insert({
                user_id: currentUser.id,
                action_type: 'user_deleted',
                entity_type: 'user',
                entity_id: userId,
                metadata: {
                    deleted_user: targetProfile || { id: userId },
                    deleted_by: currentUser.id
                }
            });
        } catch (logError) {
            // Não falhar a operação principal por erro de log
            console.warn('[delete-user] Erro ao registrar log (não crítico):', logError);
        }

        return successResponse({
            success: true,
            message: 'Usuário excluído permanentemente'
        });

    } catch (error: any) {
        console.error('[delete-user] Erro inesperado:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });

        return errorResponse(error.message || 'Erro inesperado', 500);
    }
});
