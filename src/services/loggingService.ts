import { supabase } from '../lib/supabase';
import { ActivityType, ActivityLog } from '../types/activity.types';
import { logError, logWarn } from '../lib/logger';

export const loggingService = {
    /**
     * Registra uma nova atividade no sistema
     */
    async logActivity(
        type: ActivityType,
        entityType: 'auth' | 'action' | 'user' | 'view',
        entityId?: string,
        metadata: Record<string, any> = {}
    ) {
        try {
            // Obter o usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                logWarn('loggingService', 'Usuário não autenticado, log ignorado.');
                return;
            }

            // Buscar nome do usuário para incluir nos metadados (evita dependência do join)
            let created_by_name = metadata.created_by_name;
            if (!created_by_name) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('nome')
                    .eq('id', user.id)
                    .single();
                created_by_name = profile?.nome || 'Usuário';
            }

            const { error } = await supabase.from('activity_logs').insert({
                user_id: user.id,
                action_type: type,
                entity_type: entityType,
                entity_id: entityId,
                metadata: {
                    ...metadata,
                    created_by_name,
                    created_by_id: user.id
                }
            });

            if (error) {
                logError('loggingService', 'Erro ao registrar log', error);
            }
        } catch (err) {
            logError('loggingService', 'Erro inesperado ao registrar log', err);
        }
    },


    /**
     * Busca atividades recentes
     */
    async fetchActivities(limit = 50, filter?: { type?: string; microregiaoId?: string }): Promise<ActivityLog[]> {
        try {
            // Primeiro tenta buscar com profiles join
            let query = supabase
                .from('activity_logs')
                .select(`
                    *,
                    user:profiles (
                        nome,
                        role,
                        avatar_id,
                        microregiao_id
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (filter?.type && filter.type !== 'todos') {
                query = query.eq('action_type', filter.type);
            }

            const { data, error } = await query;

            if (error) {
                logError('loggingService', 'Erro na query com join', error);
                // Fallback: buscar sem join se der erro
                const { data: dataSimple, error: errorSimple } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (errorSimple) {
                    logError('loggingService', 'Erro na query simples', errorSimple);
                    throw errorSimple;
                }

                return (dataSimple || []).map(log => ({
                    ...log,
                    user: null
                })) as ActivityLog[];
            }

            return data as ActivityLog[];
        } catch (err) {
            logError('loggingService', 'Erro ao buscar atividades', err);
            return [];
        }
    }
};
