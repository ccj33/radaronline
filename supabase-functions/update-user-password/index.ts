// supabase/functions/update-user-password/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// =====================================
// CONSTANTES
// =====================================
const MIN_PASSWORD_LENGTH = 6;
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
const checkIsAdminOrSuperadmin = async (
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

    return profile.role === 'admin' || profile.role === 'superadmin';
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

        // ✅ Verificar se é admin ou superadmin
        const isAdmin = await checkIsAdminOrSuperadmin(supabaseAdmin, currentUser.id);
        if (!isAdmin) {
            return errorResponse('Apenas administradores podem alterar senhas de outros usuários', 403);
        }

        // ✅ Parse body
        let body;
        try {
            body = await req.json();
        } catch (error: any) {
            console.error('[update-user-password] Erro ao parsear body:', error);
            return errorResponse('Dados inválidos', 400);
        }

        const { userId, password } = body;

        // ✅ Validar campos
        if (!userId) {
            return errorResponse('ID do usuário é obrigatório', 400);
        }

        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            return errorResponse(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`, 400);
        }

        // ✅ PROTEÇÃO SUPERADMIN: Verificar se está tentando alterar senha de superadmin
        const targetIsSuperadmin = await checkIsSuperadmin(supabaseAdmin, userId);

        if (targetIsSuperadmin && currentUser.id !== userId) {
            return errorResponse('Não é possível alterar a senha do Super Admin. Apenas ele mesmo pode alterá-la.', 403);
        }

        // ✅ Log da operação
        console.log('[update-user-password] Atualizando senha para userId:', userId, 'por:', currentUser.id);

        // ✅ Atualizar senha via Admin API
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (updateError) {
            console.error('[update-user-password] Erro ao atualizar senha:', updateError);
            return errorResponse(updateError.message || 'Erro ao atualizar senha', 500);
        }

        console.log('[update-user-password] Senha atualizada com sucesso para:', userId);

        // ✅ Registrar atividade (opcional - se activity_logs existe)
        try {
            await supabaseAdmin.from('activity_logs').insert({
                user_id: currentUser.id,
                action_type: 'user_password_updated',
                entity_type: 'user',
                entity_id: userId,
                metadata: { updated_by: currentUser.id }
            });
        } catch (logError) {
            // Não falhar a operação principal por erro de log
            console.warn('[update-user-password] Erro ao registrar log (não crítico):', logError);
        }

        return successResponse({
            success: true,
            message: 'Senha atualizada com sucesso'
        });

    } catch (error: any) {
        console.error('[update-user-password] Erro inesperado:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });

        return errorResponse(error.message || 'Erro inesperado', 500);
    }
});
