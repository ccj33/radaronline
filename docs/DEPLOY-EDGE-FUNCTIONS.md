// =====================================
// SUPABASE EDGE FUNCTION: update-user-password
// Cole este código no Supabase Dashboard > Edge Functions
// =====================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.3';

// =====================================
// CONSTANTES
// =====================================
const MIN_PASSWORD_LENGTH = 6;

// CORS Headers - Aceita qualquer origem em dev, configure ALLOWED_ORIGIN em produção
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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
            console.log('[update-user-password] Sem header de autorização');
            return errorResponse('Não autenticado', 401);
        }
        const token = authHeader.replace('Bearer ', '');

        // ✅ Cliente Admin (usa service_role key)
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[update-user-password] Variáveis de ambiente não configuradas');
            return errorResponse('Configuração do servidor inválida', 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // ✅ Obter usuário atual pelo token
        const { data: authData, error: userError } = await supabaseAdmin.auth.getUser(token);
        
        if (userError || !authData?.user) {
            console.log('[update-user-password] Erro ao obter usuário:', userError?.message);
            return errorResponse('Não autenticado', 401);
        }
        
        const currentUser = authData.user;
        console.log('[update-user-password] Usuário autenticado:', currentUser.id, currentUser.email);

        // ✅ Buscar perfil do usuário atual
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, role, nome')
            .eq('id', currentUser.id)
            .single();

        console.log('[update-user-password] Profile encontrado:', profile, 'Erro:', profileError?.message);

        // ✅ Verificar se é admin ou superadmin
        const isAdmin = profile && (profile.role === 'admin' || profile.role === 'superadmin');
        
        if (!isAdmin) {
            console.log('[update-user-password] Usuário não é admin. Role:', profile?.role);
            return errorResponse('Apenas administradores podem alterar senhas de outros usuários', 403);
        }

        console.log('[update-user-password] Usuário é admin:', profile.role);

        // ✅ Parse body
        let body;
        try {
            body = await req.json();
        } catch {
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

        // ✅ Verificar se está tentando alterar senha de superadmin
        const { data: targetProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (targetProfile?.role === 'superadmin' && currentUser.id !== userId) {
            return errorResponse('Não é possível alterar a senha do Super Admin', 403);
        }

        // ✅ Atualizar senha via Admin API
        console.log('[update-user-password] Atualizando senha para:', userId);
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (updateError) {
            console.error('[update-user-password] Erro ao atualizar:', updateError);
            return errorResponse(updateError.message || 'Erro ao atualizar senha', 500);
        }

        console.log('[update-user-password] Senha atualizada com sucesso!');

        // ✅ Registrar log (não crítico)
        try {
            await supabaseAdmin.from('activity_logs').insert({
                user_id: currentUser.id,
                action_type: 'user_password_updated',
                entity_type: 'user',
                entity_id: userId,
                metadata: { updated_by: currentUser.id }
            });
        } catch (e) {
            console.warn('[update-user-password] Erro ao registrar log:', e);
        }

        return successResponse({
            success: true,
            message: 'Senha atualizada com sucesso'
        });

    } catch (error: any) {
        console.error('[update-user-password] Erro:', error);
        return errorResponse(error.message || 'Erro inesperado', 500);
    }
});
