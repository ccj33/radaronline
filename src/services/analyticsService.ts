// ============================================
// SERVICE: Analytics - Radar
// Persistência e agregação de dados de analytics
// ============================================

import { supabase } from '../lib/supabase';
import type {
    AnalyticsEvent,
    UserSession,
    DeviceInfo,
    PageViewStats,
    TopPage,
    RegionEngagement,
    InactiveMunicipality,
    HourlyUsage,
    ActionMetrics,
    AnalyticsFilter,
    AnalyticsSummary
} from '../types/analytics.types';

// Constantes
const INACTIVE_THRESHOLD_DAYS = 7;
const DEFAULT_PERIOD_DAYS = 30;

export const analyticsService = {
    // =========================================
    // SESSÕES
    // =========================================

    /**
     * Criar nova sessão de usuário
     */
    async startSession(userId: string, deviceInfo: DeviceInfo): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: userId,
                    device_info: deviceInfo
                })
                .select('id')
                .single();

            if (error) {
                console.error('[analyticsService] Erro ao criar sessão:', error);
                return null;
            }

            return data.id;
        } catch (err) {
            console.error('[analyticsService] Erro inesperado ao criar sessão:', err);
            return null;
        }
    },

    /**
     * Finalizar sessão (calcular duração)
     */
    async endSession(sessionId: string): Promise<void> {
        try {
            // Buscar a sessão para calcular duração
            const { data: session } = await supabase
                .from('user_sessions')
                .select('started_at')
                .eq('id', sessionId)
                .single();

            if (!session) return;

            const startedAt = new Date(session.started_at);
            const endedAt = new Date();
            const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

            // Contar páginas visitadas
            const { count } = await supabase
                .from('user_analytics')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .eq('event_type', 'page_view');

            await supabase
                .from('user_sessions')
                .update({
                    ended_at: endedAt.toISOString(),
                    duration_seconds: durationSeconds,
                    page_count: count || 0
                })
                .eq('id', sessionId);
        } catch (err) {
            console.error('[analyticsService] Erro ao finalizar sessão:', err);
        }
    },

    // =========================================
    // EVENTOS
    // =========================================

    /**
     * Registrar evento de analytics
     */
    async trackEvent(event: AnalyticsEvent): Promise<void> {
        try {
            const { error } = await supabase
                .from('user_analytics')
                .insert({
                    session_id: event.sessionId,
                    user_id: event.userId,
                    event_type: event.eventType,
                    page: event.page,
                    element: event.element,
                    scroll_depth: event.scrollDepth,
                    duration_seconds: event.durationSeconds,
                    metadata: event.metadata || {}
                });

            if (error) {
                console.error('[analyticsService] Erro ao registrar evento:', error);
            }
        } catch (err) {
            console.error('[analyticsService] Erro inesperado ao registrar evento:', err);
        }
    },

    /**
     * Batch insert de eventos (para performance)
     */
    async trackEvents(events: AnalyticsEvent[]): Promise<void> {
        try {
            const records = events.map(event => ({
                session_id: event.sessionId,
                user_id: event.userId,
                event_type: event.eventType,
                page: event.page,
                element: event.element,
                scroll_depth: event.scrollDepth,
                duration_seconds: event.durationSeconds,
                metadata: event.metadata || {}
            }));

            const { error } = await supabase
                .from('user_analytics')
                .insert(records);

            if (error) {
                console.error('[analyticsService] Erro ao registrar eventos em batch:', error);
            }
        } catch (err) {
            console.error('[analyticsService] Erro inesperado ao registrar eventos:', err);
        }
    },

    // =========================================
    // AGREGAÇÕES PARA DASHBOARD
    // =========================================

    /**
     * Buscar resumo geral de analytics
     */
    async getSummary(filter?: AnalyticsFilter): Promise<AnalyticsSummary> {
        const startDate = filter?.startDate || new Date(Date.now() - DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        const endDate = filter?.endDate || new Date();

        const [
            activeUsersToday,
            activeUsersTotal,
            sessionsToday,
            avgSessionDuration,
            topPages,
            hourlyUsage,
            inactiveMunicipalities,
            regionEngagement
        ] = await Promise.all([
            this.getActiveUsersToday(),
            this.getActiveUsersInPeriod(startDate, endDate),
            this.getSessionsToday(),
            this.getAvgSessionDuration(startDate, endDate),
            this.getTopPages(10, startDate, endDate),
            this.getHourlyUsage(startDate, endDate),
            this.getInactiveMunicipalities(INACTIVE_THRESHOLD_DAYS),
            this.getEngagementByRegion(startDate, endDate)
        ]);

        // Calcular taxa de engajamento (usuários ativos / total de usuários)
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const engagementRate = totalUsers ? (activeUsersTotal / totalUsers) * 100 : 0;

        return {
            activeUsersToday,
            activeUsersTotal,
            sessionsToday,
            avgSessionDuration,
            engagementRate: Math.round(engagementRate * 10) / 10,
            topPages,
            hourlyUsage,
            inactiveMunicipalities,
            regionEngagement
        };
    },

    /**
     * Usuários ativos hoje (ÚNICO por user_id)
     */
    async getActiveUsersToday(): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await supabase
            .from('user_analytics')
            .select('user_id')
            .gte('created_at', today.toISOString());

        // Contar usuários ÚNICOS
        const uniqueUsers = new Set(data?.map(d => d.user_id).filter(Boolean) || []);
        return uniqueUsers.size;
    },

    /**
     * Usuários ativos em um período
     */
    async getActiveUsersInPeriod(startDate: Date, endDate: Date): Promise<number> {
        const { data } = await supabase
            .from('user_analytics')
            .select('user_id')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        // Contar únicos
        const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
        return uniqueUsers.size;
    },

    /**
     * Usuários ativos com detalhes (nome, micro, município)
     */
    async getActiveUsersWithDetails(startDate: Date, endDate: Date): Promise<{
        id: string;
        name: string;
        email: string;
        microregiaoId: string;
        municipio: string;
        lastActivity: string;
    }[]> {
        try {
            // Buscar user_ids ativos no período
            const { data: analyticsData, error: analyticsError } = await supabase
                .from('user_analytics')
                .select('user_id, created_at')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            console.log('[analyticsService] getActiveUsersWithDetails:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                analyticsCount: analyticsData?.length || 0,
                error: analyticsError
            });

            if (analyticsError) {
                console.error('[analyticsService] Erro ao buscar analytics:', analyticsError);
                return [];
            }

            if (!analyticsData || analyticsData.length === 0) {
                console.log('[analyticsService] Nenhum dado de analytics encontrado, buscando usuários ativos por profiles...');

                // Fallback: buscar usuários que fizeram login recentemente
                const { data: recentProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, microregiao_id, municipio, last_sign_in_at')
                    .eq('status', 'active')
                    .gte('last_sign_in_at', startDate.toISOString())
                    .order('last_sign_in_at', { ascending: false });

                if (recentProfiles && recentProfiles.length > 0) {
                    return recentProfiles.map(p => ({
                        id: p.id,
                        name: p.full_name || 'Usuário',
                        email: p.email || '',
                        microregiaoId: p.microregiao_id || '',
                        municipio: p.municipio || '',
                        lastActivity: p.last_sign_in_at || ''
                    }));
                }

                return [];
            }

            // Pegar IDs únicos e última atividade
            const lastActivityMap = new Map<string, string>();
            analyticsData.forEach(a => {
                if (a.user_id && !lastActivityMap.has(a.user_id)) {
                    lastActivityMap.set(a.user_id, a.created_at);
                }
            });

            const uniqueUserIds = Array.from(lastActivityMap.keys());
            console.log('[analyticsService] Usuários únicos encontrados:', uniqueUserIds.length);

            if (uniqueUserIds.length === 0) return [];

            // Buscar perfis
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, microregiao_id, municipio')
                .in('id', uniqueUserIds);

            if (profilesError) {
                console.error('[analyticsService] Erro ao buscar profiles:', profilesError);
                return [];
            }

            console.log('[analyticsService] Profiles encontrados:', profiles?.length || 0);

            if (!profiles) return [];

            return profiles.map(p => ({
                id: p.id,
                name: p.full_name || 'Usuário',
                email: p.email || '',
                microregiaoId: p.microregiao_id || '',
                municipio: p.municipio || '',
                lastActivity: lastActivityMap.get(p.id) || ''
            }));
        } catch (err) {
            console.error('[analyticsService] Erro inesperado em getActiveUsersWithDetails:', err);
            return [];
        }
    },

    /**
     * Sessões de hoje
     */
    async getSessionsToday(): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count } = await supabase
            .from('user_sessions')
            .select('*', { count: 'exact', head: true })
            .gte('started_at', today.toISOString());

        return count || 0;
    },

    /**
     * Duração média de sessão
     */
    async getAvgSessionDuration(startDate: Date, endDate: Date): Promise<number> {
        const { data } = await supabase
            .from('user_sessions')
            .select('duration_seconds')
            .not('duration_seconds', 'is', null)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString());

        if (!data || data.length === 0) return 0;

        const total = data.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
        return Math.round(total / data.length);
    },

    /**
     * Páginas mais acessadas
     */
    async getTopPages(limit: number, startDate: Date, endDate: Date): Promise<TopPage[]> {
        const { data } = await supabase
            .from('user_analytics')
            .select('page')
            .eq('event_type', 'page_view')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (!data || data.length === 0) return [];

        // Agrupar e contar
        const pageCount: Record<string, number> = {};
        data.forEach(d => {
            pageCount[d.page] = (pageCount[d.page] || 0) + 1;
        });

        const total = data.length;
        const sorted = Object.entries(pageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return sorted.map(([page, views]) => ({
            page,
            views,
            percentage: Math.round((views / total) * 100 * 10) / 10
        }));
    },

    /**
     * Uso por hora do dia
     */
    async getHourlyUsage(startDate: Date, endDate: Date): Promise<HourlyUsage[]> {
        const { data } = await supabase
            .from('user_analytics')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (!data || data.length === 0) return [];

        // Agrupar por hora
        const hourCount: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourCount[i] = 0;

        data.forEach(d => {
            const hour = new Date(d.created_at).getHours();
            hourCount[hour]++;
        });

        return Object.entries(hourCount).map(([hour, count]) => ({
            hour: parseInt(hour),
            count
        }));
    },

    /**
     * Municípios inativos (sem acesso nos últimos X dias)
     */
    async getInactiveMunicipalities(days: number): Promise<InactiveMunicipality[]> {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Buscar todos os municípios com usuários
        const { data: municipalities } = await supabase
            .from('profiles')
            .select('microregiao_id, municipio')
            .not('municipio', 'is', null)
            .eq('status', 'active');

        if (!municipalities) return [];

        // Buscar última atividade de cada município
        const { data: lastActivities } = await supabase
            .from('user_analytics')
            .select(`
                user_id,
                created_at,
                profiles!inner(microregiao_id, municipio)
            `)
            .order('created_at', { ascending: false });

        // Mapear última atividade por município
        const municipioActivity: Record<string, { lastActivity: string; userCount: number }> = {};

        if (lastActivities) {
            lastActivities.forEach((activity: any) => {
                const key = `${activity.profiles.microregiao_id}-${activity.profiles.municipio}`;
                if (!municipioActivity[key]) {
                    municipioActivity[key] = {
                        lastActivity: activity.created_at,
                        userCount: 1
                    };
                }
            });
        }

        // Identificar inativos
        const inactive: InactiveMunicipality[] = [];
        const uniqueMunicipios = new Map<string, { microregiaoId: string; municipio: string }>();

        municipalities.forEach(m => {
            if (m.municipio) {
                uniqueMunicipios.set(`${m.microregiao_id}-${m.municipio}`, {
                    microregiaoId: m.microregiao_id,
                    municipio: m.municipio
                });
            }
        });

        uniqueMunicipios.forEach((value, key) => {
            const activity = municipioActivity[key];
            const lastLogin = activity?.lastActivity ? new Date(activity.lastActivity) : new Date(0);

            if (lastLogin < threshold) {
                const daysSince = Math.floor((Date.now() - lastLogin.getTime()) / (24 * 60 * 60 * 1000));
                inactive.push({
                    microregiaoId: value.microregiaoId,
                    municipio: value.municipio,
                    lastLogin: lastLogin.toISOString(),
                    daysSinceLogin: daysSince,
                    userCount: activity?.userCount || 0
                });
            }
        });

        return inactive.sort((a, b) => b.daysSinceLogin - a.daysSinceLogin);
    },

    /**
     * Engajamento por região
     */
    async getEngagementByRegion(startDate: Date, endDate: Date): Promise<RegionEngagement[]> {
        const { data } = await supabase
            .from('analytics_region_engagement')
            .select('*');

        if (!data) return [];

        return data.map(d => ({
            microregiaoId: d.microregiao_id,
            municipio: d.municipio,
            activeUsers: d.active_users,
            totalViews: d.total_views,
            totalSessions: d.total_sessions,
            avgSessionDuration: d.avg_session_duration || 0,
            lastActivity: d.last_activity
        }));
    },

    /**
     * Métricas de ações
     */
    async getActionMetrics(): Promise<ActionMetrics> {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Ações criadas nos últimos 30 dias
        const { count: created } = await supabase
            .from('actions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Ações atualizadas nos últimos 30 dias
        const { count: updated } = await supabase
            .from('actions')
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', thirtyDaysAgo.toISOString());

        // Ações concluídas nos últimos 30 dias
        const { count: completed } = await supabase
            .from('actions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'concluída')
            .gte('end_date', thirtyDaysAgo.toISOString());

        // Tempo médio para conclusão
        const { data: completedActions } = await supabase
            .from('actions')
            .select('start_date, end_date')
            .eq('status', 'concluída')
            .not('start_date', 'is', null)
            .not('end_date', 'is', null);

        let avgDays = 0;
        if (completedActions && completedActions.length > 0) {
            const totalDays = completedActions.reduce((sum, action) => {
                const start = new Date(action.start_date!);
                const end = new Date(action.end_date!);
                return sum + Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
            }, 0);
            avgDays = Math.round(totalDays / completedActions.length);
        }

        return {
            totalCreated: created || 0,
            totalUpdated: updated || 0,
            totalCompleted: completed || 0,
            avgCompletionDays: avgDays
        };
    },

    /**
     * Estatísticas por página
     */
    async getPageStats(startDate: Date, endDate: Date): Promise<PageViewStats[]> {
        const { data } = await supabase
            .from('analytics_page_stats')
            .select('*')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        if (!data) return [];

        // Agrupar por página (a view já agrupa por dia, precisamos agrupar total)
        const pageStats: Record<string, PageViewStats> = {};

        data.forEach(d => {
            if (!pageStats[d.page]) {
                pageStats[d.page] = {
                    page: d.page,
                    viewCount: 0,
                    avgTimeSeconds: 0,
                    avgScrollDepth: 0,
                    uniqueUsers: 0
                };
            }
            pageStats[d.page].viewCount += d.view_count || 0;
            pageStats[d.page].avgTimeSeconds += d.avg_time_seconds || 0;
            pageStats[d.page].avgScrollDepth += d.avg_scroll_depth || 0;
            pageStats[d.page].uniqueUsers += d.unique_users || 0;
        });

        return Object.values(pageStats);
    }
};
