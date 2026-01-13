// ============================================
// DASHBOARD: Analytics - Radar
// Visualização de métricas de uso do sistema
// ============================================

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Users,
    Clock,
    TrendingUp,
    AlertTriangle,
    MapPin,
    Activity,
    RefreshCw,
    ChevronDown,
    Loader2,
    X,
    UserCheck,
    Timer,
    Zap
} from 'lucide-react';
import { analyticsService } from '../../../services/analyticsService';
import { getMicroregiaoById } from '../../../data/microregioes';
import { logError } from '../../../lib/logger';
import type {
    AnalyticsSummary,
    HourlyUsage,
    InactiveMunicipality,
    RegionEngagement,
    ActionMetrics
} from '../../../types/analytics.types';

// ============================================
// COMPONENTES DE CARDS
// ============================================

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color: 'teal' | 'blue' | 'purple' | 'amber' | 'red';
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, trend, color, onClick }) => {
    const colorClasses = {
        teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    return (
        <div
            className={`p-6 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </span>
                )}
                {onClick && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Clique para detalhes</span>
                )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};

// ============================================
// GRÁFICO DE BARRAS SIMPLES
// ============================================

interface BarChartSimpleProps {
    data: { label: string; value: number; percentage?: number }[];
    title: string;
    maxValue?: number;
}

const BarChartSimple: React.FC<BarChartSimpleProps> = ({ data, title, maxValue }) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                {title}
            </h3>
            <div className="space-y-3">
                {data.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={item.label}>
                                {item.label}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                                {item.value} {item.percentage && `(${item.percentage}%)`}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all group-hover:from-teal-400 group-hover:to-cyan-400"
                                style={{ width: `${(item.value / max) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// GRÁFICO DE LINHA (HORA DO DIA)
// ============================================

interface LineChartHourlyProps {
    data: HourlyUsage[];
    title: string;
}

const LineChartHourly: React.FC<LineChartHourlyProps> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    const chartHeight = 120;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                {title}
            </h3>
            <div className="relative" style={{ height: chartHeight + 40 }}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="border-b border-gray-100 dark:border-gray-700" />
                    ))}
                </div>

                {/* Bars */}
                <div className="absolute inset-0 flex items-end justify-between px-1" style={{ bottom: 20 }}>
                    {data.map((item, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center group cursor-pointer"
                            style={{ width: `${100 / 24}%` }}
                        >
                            <div
                                className="w-full max-w-[12px] bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all group-hover:from-blue-400 group-hover:to-cyan-300"
                                style={{
                                    height: `${(item.count / maxValue) * chartHeight}px`,
                                    minHeight: item.count > 0 ? 4 : 0
                                }}
                            />
                            <span className="text-[10px] text-gray-400 mt-1">{item.hour}</span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {item.hour}h: {item.count} eventos
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================
// LISTA DE MUNICÍPIOS INATIVOS
// ============================================

interface InactiveListProps {
    municipalities: InactiveMunicipality[];
}

const InactiveList: React.FC<InactiveListProps> = ({ municipalities }) => {
    if (municipalities.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Municípios Inativos
                </h3>
                <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Todos os municípios ativos!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Nenhum município está inativo há mais de 7 dias.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Municípios Inativos
                <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                    {municipalities.length}
                </span>
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {municipalities.slice(0, 10).map((mun, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{mun.municipio}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{mun.microregiaoId}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-sm font-medium ${mun.daysSinceLogin > 14 ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                {mun.daysSinceLogin} dias
                            </span>
                            <p className="text-xs text-gray-500">{mun.userCount} usuário(s)</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// TABELA DE ENGAJAMENTO POR REGIÃO
// ============================================

interface RegionTableProps {
    regions: RegionEngagement[];
}

const RegionTable: React.FC<RegionTableProps> = ({ regions }) => {
    const [expanded, setExpanded] = useState<string | null>(null);

    // Filtrar regiões válidas e agrupar por microrregião
    const validRegions = regions.filter(r => r.microregiaoId && r.microregiaoId !== 'null');

    const grouped = validRegions.reduce((acc, region) => {
        if (!acc[region.microregiaoId]) {
            acc[region.microregiaoId] = [];
        }
        acc[region.microregiaoId].push(region);
        return acc;
    }, {} as Record<string, RegionEngagement[]>);

    // Helper para obter nome da microrregião
    const getMicroName = (microId: string): string => {
        const micro = getMicroregiaoById(microId);
        return micro?.nome || microId;
    };

    if (Object.keys(grouped).length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    Engajamento por Região
                </h3>
                <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Nenhum dado de região disponível ainda.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Os dados aparecerão após usuários navegarem pelo sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-500" />
                Engajamento por Região
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Região</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Usuários Ativos</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Visualizações</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Sessões</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Tempo Médio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(grouped).map(([microId, municipios]) => {
                            const total = municipios.reduce((acc, m) => ({
                                activeUsers: acc.activeUsers + m.activeUsers,
                                totalViews: acc.totalViews + m.totalViews,
                                totalSessions: acc.totalSessions + m.totalSessions,
                                avgDuration: acc.avgDuration + (m.avgSessionDuration || 0)
                            }), { activeUsers: 0, totalViews: 0, totalSessions: 0, avgDuration: 0 });

                            const avgMinutes = municipios.length > 0
                                ? Math.round(total.avgDuration / municipios.length / 60)
                                : 0;

                            return (
                                <React.Fragment key={microId}>
                                    <tr
                                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => setExpanded(expanded === microId ? null : microId)}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded === microId ? 'rotate-180' : ''}`} />
                                                <span className="font-medium text-gray-900 dark:text-white">{getMicroName(microId)}</span>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">{total.activeUsers}</td>
                                        <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">{total.totalViews}</td>
                                        <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">{total.totalSessions}</td>
                                        <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
                                            {avgMinutes > 0 ? `${avgMinutes}min` : '<1min'}
                                        </td>
                                    </tr>
                                    {expanded === microId && municipios.filter(m => m.municipio).map((mun, idx) => (
                                        <tr key={idx} className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-2 px-4 pl-10 text-sm text-gray-600 dark:text-gray-400">{mun.municipio}</td>
                                            <td className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{mun.activeUsers}</td>
                                            <td className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{mun.totalViews}</td>
                                            <td className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400">{mun.totalSessions}</td>
                                            <td className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {mun.avgSessionDuration > 0 ? `${Math.round(mun.avgSessionDuration / 60)}min` : '<1min'}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============================================
// MÉTRICAS DE AÇÕES
// ============================================

interface ActionMetricsCardProps {
    metrics: ActionMetrics;
}

const ActionMetricsCard: React.FC<ActionMetricsCardProps> = ({ metrics }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-500" />
            Métricas de Ações (30 dias)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{metrics.totalCreated}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Criadas</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.totalUpdated}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Atualizadas</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.totalCompleted}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Concluídas</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.avgCompletionDays}d</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Médio</p>
            </div>
        </div>
    </div>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

type PeriodFilter = 'today' | '7d' | '30d' | '60d' | '90d';

export const AnalyticsDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>('30d');
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [actionMetrics, setActionMetrics] = useState<ActionMetrics | null>(null);
    const [openModal, setOpenModal] = useState<'users' | 'sessions' | 'time' | 'engagement' | null>(null);
    const [activeUsersList, setActiveUsersList] = useState<{
        id: string;
        name: string;
        email: string;
        microregiaoId: string;
        municipio: string;
        lastActivity: string;
    }[]>([]);

    const periodDays: Record<PeriodFilter, number> = {
        'today': 0,
        '7d': 7,
        '30d': 30,
        '60d': 60,
        '90d': 90
    };

    const periodLabels: Record<PeriodFilter, string> = {
        'today': 'Hoje',
        '7d': '7 dias',
        '30d': '30 dias',
        '60d': '60 dias',
        '90d': '90 dias'
    };

    const loadData = async () => {
        setLoading(true);
        try {
            let startDate: Date;
            if (period === 'today') {
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date(Date.now() - periodDays[period] * 24 * 60 * 60 * 1000);
            }
            const endDate = new Date();

            const [summaryData, actionData, usersData] = await Promise.all([
                analyticsService.getSummary({ startDate, endDate }),
                analyticsService.getActionMetrics(),
                analyticsService.getActiveUsersWithDetails(startDate, endDate)
            ]);

            setSummary(summaryData);
            setActionMetrics(actionData);
            setActiveUsersList(usersData);
        } catch (error) {
            logError('AnalyticsDashboard', 'Erro ao carregar analytics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]); // loadData é definido no escopo, não precisa ser dependência

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Carregando analytics...</p>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Erro ao carregar dados de analytics.</p>
                <button
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
                    <p className="text-gray-600 dark:text-gray-400">Métricas de uso do sistema</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period selector */}
                    <div className="flex flex-wrap bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
                        {(['today', '7d', '30d', '60d', '90d'] as PeriodFilter[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${period === p
                                    ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-400 shadow'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 text-gray-500 hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Usuários Ativos Hoje"
                    value={summary.activeUsersToday}
                    subtitle="Acessaram o sistema hoje"
                    icon={<Users className="w-6 h-6" />}
                    color="teal"
                    onClick={() => setOpenModal('users')}
                />
                <KPICard
                    title="Sessões Hoje"
                    value={summary.sessionsToday}
                    subtitle="Sessões iniciadas"
                    icon={<Activity className="w-6 h-6" />}
                    color="blue"
                    onClick={() => setOpenModal('sessions')}
                />
                <KPICard
                    title="Tempo Médio"
                    value={`${Math.round(summary.avgSessionDuration / 60)}min`}
                    subtitle="Duração média de sessão"
                    icon={<Clock className="w-6 h-6" />}
                    color="purple"
                    onClick={() => setOpenModal('time')}
                />
                <KPICard
                    title="Taxa de Engajamento"
                    value={`${summary.engagementRate}%`}
                    subtitle="Usuários ativos / total"
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="amber"
                    onClick={() => setOpenModal('engagement')}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChartSimple
                    title="Páginas Mais Acessadas"
                    data={summary.topPages.map(p => ({
                        label: formatPageName(p.page),
                        value: p.views,
                        percentage: p.percentage
                    }))}
                />
                <LineChartHourly
                    title="Uso por Hora do Dia"
                    data={summary.hourlyUsage}
                />
            </div>

            {/* Action Metrics */}
            {actionMetrics && <ActionMetricsCard metrics={actionMetrics} />}

            {/* Region Engagement & Inactive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InactiveList municipalities={summary.inactiveMunicipalities} />
                <RegionTable regions={summary.regionEngagement} />
            </div>

            {/* Modal Detalhes */}
            {openModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className={`p-6 text-white relative overflow-hidden ${openModal === 'users' ? 'bg-gradient-to-r from-teal-500 to-emerald-500' :
                            openModal === 'sessions' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                openModal === 'time' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                                    'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}>
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                            <div className="relative flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        {openModal === 'users' && <Users className="w-6 h-6" />}
                                        {openModal === 'sessions' && <Activity className="w-6 h-6" />}
                                        {openModal === 'time' && <Clock className="w-6 h-6" />}
                                        {openModal === 'engagement' && <TrendingUp className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">
                                            {openModal === 'users' && 'Usuários Ativos'}
                                            {openModal === 'sessions' && 'Sessões'}
                                            {openModal === 'time' && 'Tempo de Uso'}
                                            {openModal === 'engagement' && 'Engajamento'}
                                        </h2>
                                        <p className="text-white/80 text-sm mt-1">
                                            {openModal === 'users' && 'Detalhes dos usuários ativos'}
                                            {openModal === 'sessions' && 'Análise de sessões do sistema'}
                                            {openModal === 'time' && 'Análise de tempo médio de uso'}
                                            {openModal === 'engagement' && 'Taxa de engajamento detalhada'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOpenModal(null)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Métrica Principal */}
                            <div className="mt-6 flex items-end gap-2">
                                {openModal === 'users' && (
                                    <>
                                        <span className="text-5xl font-bold">{summary.activeUsersToday}</span>
                                        <span className="text-white/70 mb-2">usuários hoje | {summary.activeUsersTotal} no período</span>
                                    </>
                                )}
                                {openModal === 'sessions' && (
                                    <>
                                        <span className="text-5xl font-bold">{summary.sessionsToday}</span>
                                        <span className="text-white/70 mb-2">sessões iniciadas hoje</span>
                                    </>
                                )}
                                {openModal === 'time' && (
                                    <>
                                        <span className="text-5xl font-bold">{Math.round(summary.avgSessionDuration / 60)}min</span>
                                        <span className="text-white/70 mb-2">tempo médio por sessão</span>
                                    </>
                                )}
                                {openModal === 'engagement' && (
                                    <>
                                        <span className="text-5xl font-bold">{summary.engagementRate}%</span>
                                        <span className="text-white/70 mb-2">dos usuários estão ativos</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[50vh]">
                            {/* Usuários Ativos */}
                            {openModal === 'users' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-teal-600" />
                                        Distribuição de Usuários
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-center">
                                            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{summary.activeUsersToday}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Ativos Hoje</p>
                                        </div>
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activeUsersList.length}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Ativos no Período</p>
                                        </div>
                                    </div>

                                    {/* Lista de Usuários */}
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                            Usuários Ativos ({activeUsersList.length})
                                        </h4>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {activeUsersList.length === 0 ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                                    Nenhum usuário ativo no período selecionado.
                                                </p>
                                            ) : (
                                                activeUsersList.map((user, idx) => (
                                                    <div
                                                        key={user.id || idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                                                <span className="text-teal-700 dark:text-teal-300 font-medium text-sm">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{user.name}</p>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded">
                                                                        {getMicroregiaoById(user.microregiaoId)?.nome || user.microregiaoId || 'N/A'}
                                                                    </span>
                                                                    {user.municipio && (
                                                                        <span className="text-gray-400">• {user.municipio}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {user.lastActivity ? new Date(user.lastActivity).toLocaleString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }) : '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sessões */}
                            {openModal === 'sessions' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-600" />
                                        Análise de Sessões
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.sessionsToday}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Sessões Hoje</p>
                                        </div>
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{Math.round(summary.avgSessionDuration / 60)}min</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Duração Média</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pico de Uso por Hora</h4>
                                        <div className="flex items-end gap-1 h-24">
                                            {summary.hourlyUsage.map((h, idx) => {
                                                const max = Math.max(...summary.hourlyUsage.map(x => x.count), 1);
                                                const height = (h.count / max) * 100;
                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                                        <div
                                                            className="w-full bg-blue-500 rounded-t transition-all"
                                                            style={{ height: `${height}%`, minHeight: h.count > 0 ? 4 : 0 }}
                                                        />
                                                        {idx % 4 === 0 && <span className="text-[10px] text-gray-400 mt-1">{h.hour}h</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tempo de Uso */}
                            {openModal === 'time' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-purple-600" />
                                        Análise de Tempo
                                    </h3>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Tempo médio de sessão</span>
                                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(summary.avgSessionDuration / 60)} min</span>
                                        </div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                                                style={{ width: `${Math.min((summary.avgSessionDuration / 60 / 30) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Meta: 30 minutos por sessão</p>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Páginas Mais Visitadas</h4>
                                        {summary.topPages.slice(0, 5).map((page, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatPageName(page.page)}</span>
                                                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{page.views} views ({page.percentage}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Engajamento */}
                            {openModal === 'engagement' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-600" />
                                        Análise de Engajamento
                                    </h3>
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Engajamento</span>
                                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.engagementRate}%</span>
                                        </div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                                style={{ width: `${summary.engagementRate}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Usuários ativos / total de usuários cadastrados</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary.activeUsersTotal}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Usuários Ativos</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                            <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
                                                {Math.round(summary.activeUsersTotal / (summary.engagementRate / 100))}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Total Cadastrados</p>
                                        </div>
                                    </div>
                                    {summary.inactiveMunicipalities.length > 0 && (
                                        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                                            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                                                ⚠️ {summary.inactiveMunicipalities.length} município(s) inativo(s)
                                            </p>
                                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                                                Sem acesso nos últimos 7 dias
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setOpenModal(null)}
                                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg font-semibold transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper para formatar nome da página
function formatPageName(page: string): string {
    const names: Record<string, string> = {
        '/': 'Dashboard',
        '/dashboard': 'Dashboard',
        '/actions': 'Ações',
        '/team': 'Equipe',
        '/gantt': 'Cronograma',
        '/settings': 'Configurações',
        '/admin': 'Admin',
        '/login': 'Login'
    };
    return names[page] || page.replace(/^\//, '').replace(/-/g, ' ') || 'Home';
}

export default AnalyticsDashboard;
