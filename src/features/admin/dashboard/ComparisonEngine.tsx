import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';
import {
    Target,
    Users,
    AlertOctagon,
    TrendingUp,
    ArrowRight,
    MapPin,
    Building2,
    Layers
} from 'lucide-react';
import { Action } from '../../../types';
import { User } from '../../../types/auth.types';
import {
    MACRORREGIOES,
    MICROREGIOES,
    MUNICIPIOS,
    getMicroregioesByMacro,
    getMunicipiosByMicro,
    Macrorregiao,
    Municipio
} from '../../../data/microregioes';
import { CompareLevel } from './DashboardFilters';

interface ComparisonEngineProps {
    compareLevel: CompareLevel;
    entityA: string | null;
    entityB: string | null;
    actions: Action[];
    users: User[];
}

interface EntityMetrics {
    id: string;
    name: string;
    totalActions: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    completionRate: number;
    avgProgress: number;
    userCount: number;
    activeUsers: number;
    microCount?: number;
    municipioCount?: number;
}

function calculateMacroMetrics(
    macroId: string,
    actions: Action[],
    users: User[]
): EntityMetrics | null {
    const macro = MACRORREGIOES.find(m => m.id === macroId);
    if (!macro) return null;

    const micros = getMicroregioesByMacro(macro.nome);
    const microIds = new Set(micros.map(m => m.id));

    const macroActions = actions.filter(a => microIds.has(a.microregiaoId));
    const macroUsers = users.filter(u => microIds.has(u.microregiaoId));

    const hoje = new Date();
    const completed = macroActions.filter(a => a.status === 'Concluído').length;
    const inProgress = macroActions.filter(a => a.status === 'Em Andamento').length;
    const notStarted = macroActions.filter(a => a.status === 'Não Iniciado').length;
    const overdue = macroActions.filter(a => {
        if (a.status === 'Concluído') return false;
        return new Date(a.plannedEndDate) < hoje;
    }).length;

    const totalActions = macroActions.length;
    const completionRate = totalActions > 0 ? Math.round((completed / totalActions) * 100) : 0;
    const avgProgress = totalActions > 0
        ? Math.round(macroActions.reduce((sum, a) => sum + a.progress, 0) / totalActions)
        : 0;

    // Count municipalities in this macro
    let municipioCount = 0;
    micros.forEach(micro => {
        municipioCount += getMunicipiosByMicro(micro.id).length;
    });

    return {
        id: macro.id,
        name: macro.nome,
        totalActions,
        completed,
        inProgress,
        notStarted,
        overdue,
        completionRate,
        avgProgress,
        userCount: macroUsers.length,
        activeUsers: macroUsers.filter(u => u.ativo).length,
        microCount: micros.length,
        municipioCount,
    };
}

function calculateMicroMetrics(
    microId: string,
    actions: Action[],
    users: User[]
): EntityMetrics | null {
    const micro = MICROREGIOES.find(m => m.id === microId);
    if (!micro) return null;

    // Users are tied to microrregioes
    const microUsers = users.filter(u => u.microregiaoId === micro.id);

    // Actions are at micro level
    const microActions = actions.filter(a => a.microregiaoId === micro.id);

    const hoje = new Date();
    const completed = microActions.filter(a => a.status === 'Concluído').length;
    const inProgress = microActions.filter(a => a.status === 'Em Andamento').length;
    const notStarted = microActions.filter(a => a.status === 'Não Iniciado').length;
    const overdue = microActions.filter(a => {
        if (a.status === 'Concluído') return false;
        return new Date(a.plannedEndDate) < hoje;
    }).length;

    const totalActions = microActions.length;
    const completionRate = totalActions > 0 ? Math.round((completed / totalActions) * 100) : 0;
    const avgProgress = totalActions > 0
        ? Math.round(microActions.reduce((sum, a) => sum + a.progress, 0) / totalActions)
        : 0;

    // Count municipalities in this micro
    const municipioCount = getMunicipiosByMicro(micro.id).length;

    return {
        id: micro.id,
        name: micro.nome,
        totalActions,
        completed,
        inProgress,
        notStarted,
        overdue,
        completionRate,
        avgProgress,
        userCount: microUsers.length,
        activeUsers: microUsers.filter(u => u.ativo).length,
        municipioCount,
    };
}

// Comparison Card Component
function ComparisonCard({
    label,
    valueA,
    valueB,
    icon,
    format = 'number',
    higherIsBetter = true,
}: {
    label: string;
    valueA: number;
    valueB: number;
    icon: React.ReactNode;
    format?: 'number' | 'percent';
    higherIsBetter?: boolean;
}) {
    const diff = valueA - valueB;
    const aWins = higherIsBetter ? diff > 0 : diff < 0;
    const bWins = higherIsBetter ? diff < 0 : diff > 0;
    const formatValue = (v: number) => format === 'percent' ? `${v}%` : v.toString();

    return (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4 shadow-sm hover:shadow-lg transition-all text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                    {icon}
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
            </div>
            <div className="flex items-center justify-between">
                {/* Entity A */}
                <div className={`text-center flex-1 ${aWins ? 'scale-105' : ''}`}>
                    <span className={`text-2xl font-bold ${aWins ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatValue(valueA)}
                    </span>
                    {aWins && <TrendingUp className="w-4 h-4 text-teal-500 inline ml-1" />}
                </div>

                {/* VS */}
                <div className="px-3">
                    <span className="text-xs text-slate-400 font-bold">vs</span>
                </div>

                {/* Entity B */}
                <div className={`text-center flex-1 ${bWins ? 'scale-105' : ''}`}>
                    <span className={`text-2xl font-bold ${bWins ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatValue(valueB)}
                    </span>
                    {bWins && <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400 inline ml-1" />}
                </div>
            </div>
        </div>
    );
}

export function ComparisonEngine({
    compareLevel,
    entityA,
    entityB,
    actions,
    users,
}: ComparisonEngineProps) {
    // Calculate metrics for both entities
    const metricsA = useMemo(() => {
        if (!entityA) return null;
        return compareLevel === 'macro'
            ? calculateMacroMetrics(entityA, actions, users)
            : calculateMicroMetrics(entityA, actions, users);
    }, [entityA, compareLevel, actions, users]);

    const metricsB = useMemo(() => {
        if (!entityB) return null;
        return compareLevel === 'macro'
            ? calculateMacroMetrics(entityB, actions, users)
            : calculateMicroMetrics(entityB, actions, users);
    }, [entityB, compareLevel, actions, users]);

    // Data for bar chart
    const barChartData = useMemo(() => {
        if (!metricsA || !metricsB) return [];
        return [
            { name: 'Concluídas', A: metricsA.completed, B: metricsB.completed },
            { name: 'Em Andamento', A: metricsA.inProgress, B: metricsB.inProgress },
            { name: 'Não Iniciadas', A: metricsA.notStarted, B: metricsB.notStarted },
            { name: 'Atrasadas', A: metricsA.overdue, B: metricsB.overdue },
        ];
    }, [metricsA, metricsB]);

    // Data for radar chart
    const radarData = useMemo(() => {
        if (!metricsA || !metricsB) return [];
        return [
            { metric: 'Conclusão', A: metricsA.completionRate, B: metricsB.completionRate, fullMark: 100 },
            { metric: 'Progresso', A: metricsA.avgProgress, B: metricsB.avgProgress, fullMark: 100 },
            { metric: 'Usuários', A: Math.min(metricsA.userCount * 10, 100), B: Math.min(metricsB.userCount * 10, 100), fullMark: 100 },
            { metric: 'Ações', A: Math.min(metricsA.totalActions * 2, 100), B: Math.min(metricsB.totalActions * 2, 100), fullMark: 100 },
        ];
    }, [metricsA, metricsB]);

    if (!entityA || !entityB) {
        return (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center transition-colors">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/30 flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Selecione duas entidades para comparar
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Escolha {compareLevel === 'macro' ? 'duas Macrorregiões' : 'duas Microrregiões'} nos seletores acima
                </p>
            </div>
        );
    }

    if (!metricsA || !metricsB) {
        return (
            <div className="bg-red-50 rounded-xl p-6 text-center text-red-600">
                Erro ao carregar métricas das entidades selecionadas.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Entity Names */}
            <div className="flex items-center justify-center gap-4 mb-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-full transition-colors">
                    <div className="w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center">A</div>
                    {compareLevel === 'macro' ? <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                    <span className="font-semibold text-teal-800 dark:text-teal-300">{metricsA.name}</span>
                </div>
                <span className="text-slate-400 font-bold text-lg">×</span>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-full transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">B</div>
                    {compareLevel === 'macro' ? <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    <span className="font-semibold text-blue-800 dark:text-blue-300">{metricsB.name}</span>
                </div>
            </div>

            {/* KPI Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ComparisonCard
                    label="Taxa de Conclusão"
                    valueA={metricsA.completionRate}
                    valueB={metricsB.completionRate}
                    icon={<Target className="w-5 h-5" />}
                    format="percent"
                    higherIsBetter={true}
                />
                <ComparisonCard
                    label="Total de Ações"
                    valueA={metricsA.totalActions}
                    valueB={metricsB.totalActions}
                    icon={<MapPin className="w-5 h-5" />}
                    higherIsBetter={true}
                />
                <ComparisonCard
                    label="Atrasadas"
                    valueA={metricsA.overdue}
                    valueB={metricsB.overdue}
                    icon={<AlertOctagon className="w-5 h-5" />}
                    higherIsBetter={false}
                />
                <ComparisonCard
                    label="Usuários Ativos"
                    valueA={metricsA.activeUsers}
                    valueB={metricsB.activeUsers}
                    icon={<Users className="w-5 h-5" />}
                    higherIsBetter={true}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm transition-colors">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Distribuição de Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.3} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-sm">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center gap-2 mb-1">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                            <span className="text-slate-600 dark:text-slate-400">
                                                                {entry.name}: <span className="font-medium text-slate-900 dark:text-slate-100">{entry.value}</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="A" name={metricsA.name} fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="B" name={metricsB.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Radar Chart */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-sm transition-colors">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Comparativo de Performance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#94a3b8" strokeOpacity={0.3} />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Radar name={metricsA.name} dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} />
                                <Radar name={metricsB.name} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Additional info for Macro comparison (micros count) OR Micro comparison (municipios count) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {compareLevel === 'macro' && metricsA.microCount !== undefined && metricsB.microCount !== undefined && (
                    <ComparisonCard
                        label="Microrregiões"
                        valueA={metricsA.microCount}
                        valueB={metricsB.microCount}
                        icon={<MapPin className="w-5 h-5" />}
                    />
                )}
                <ComparisonCard
                    label="Municípios"
                    valueA={metricsA.municipioCount || 0}
                    valueB={metricsB.municipioCount || 0}
                    icon={<Building2 className="w-5 h-5" />}
                />
            </div>
        </div>
    );
}
