import { useState } from 'react';
import { X, Target, AlertOctagon, MapPin, CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, BarChart2, PieChart as PieChartIcon, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Action } from '../../../types';
import { MICROREGIOES, getMicroregiaoById } from '../../../data/microregioes';

type KpiType = 'conclusao' | 'risco' | 'cobertura' | 'horizonte' | 'status';

interface ObjectiveProgress {
    id: number;
    name: string;
    total: number;
    completed: number;
    percentage: number;
}

interface OverdueAction {
    uid: string;
    id: string;
    title: string;
    plannedEndDate: string;
    responsible: string;
    daysOverdue: number;
}

interface MicroCoverage {
    id: string;
    nome: string;
    macrorregiao: string;
    hasActions: boolean;
    actionCount: number;
}

interface DeadlineItem {
    name: string;
    value: number;
    color: string;
    actions?: ActionSummary[];
}

interface StatusItem {
    name: string;
    value: number;
    color: string;
    actions?: ActionSummary[];
}

// Resumo de ação para exibição
export interface ActionSummary {
    uid: string;
    id: string;
    title: string;
    status: string;
    plannedEndDate: string;
    responsible?: string;
    microName?: string;
}

interface KpiDetailModalProps {
    type: KpiType;
    isOpen: boolean;
    onClose: () => void;
    // Dados específicos
    objectiveProgress?: ObjectiveProgress[];
    overdueActions?: OverdueAction[];
    microCoverage?: MicroCoverage[];
    deadlineHorizon?: DeadlineItem[];
    statusData?: StatusItem[];
    // Métricas gerais
    totalActions?: number;
    completedActions?: number;
    completionRate?: number;
    coverageRate?: number;
}

export function KpiDetailModal({
    type,
    isOpen,
    onClose,
    objectiveProgress = [],
    overdueActions = [],
    microCoverage = [],
    deadlineHorizon = [],
    statusData = [],
    totalActions = 0,
    completedActions = 0,
    completionRate = 0,
    coverageRate = 0,
}: KpiDetailModalProps) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    if (!isOpen) return null;

    const configs: Record<KpiType, { title: string; subtitle: string; icon: React.ReactNode; bgGradient: string }> = {
        conclusao: {
            title: 'Taxa de Conclusão',
            subtitle: 'Análise detalhada do progresso por objetivo',
            icon: <Target className="w-6 h-6" />,
            bgGradient: 'from-teal-500 to-emerald-500',
        },
        risco: {
            title: 'Risco de Prazo',
            subtitle: 'Ações que precisam de atenção urgente',
            icon: <AlertOctagon className="w-6 h-6" />,
            bgGradient: 'from-rose-500 to-red-500',
        },
        cobertura: {
            title: 'Cobertura Regional',
            subtitle: 'Distribuição de ações por microrregião',
            icon: <MapPin className="w-6 h-6" />,
            bgGradient: 'from-blue-500 to-indigo-500',
        },
        horizonte: {
            title: 'Horizonte de Prazos',
            subtitle: 'Clique em cada período para ver as ações',
            icon: <Calendar className="w-6 h-6" />,
            bgGradient: 'from-amber-500 to-orange-500',
        },
        status: {
            title: 'Status Global',
            subtitle: 'Clique em cada status para ver as ações',
            icon: <PieChartIcon className="w-6 h-6" />,
            bgGradient: 'from-violet-500 to-purple-500',
        },
    };

    const config = configs[type];

    // Calcula totais para horizonte/status
    const deadlineTotal = deadlineHorizon.reduce((sum, d) => sum + d.value, 0);
    const statusTotal = statusData.reduce((sum, s) => sum + s.value, 0);

    const toggleCategory = (name: string) => {
        setExpandedCategory(expandedCategory === name ? null : name);
    };

    // Componente para renderizar lista de ações
    const ActionList = ({ actions }: { actions?: ActionSummary[] }) => {
        if (!actions || actions.length === 0) {
            return (
                <p className="text-slate-500 dark:text-slate-400 text-sm italic py-2 px-3">
                    Nenhuma ação nesta categoria
                </p>
            );
        }
        return (
            <div className="space-y-2 py-2">
                {actions.map(action => (
                    <div
                        key={action.uid}
                        className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600 shadow-sm"
                    >
                        <div className="flex items-start gap-2">
                            <span className="bg-slate-600 dark:bg-slate-500 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0">
                                #{action.id}
                            </span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1">
                                {action.title}
                            </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {action.microName && (
                                <span className="flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">
                                    <MapPin className="w-3 h-3" />
                                    {action.microName}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {action.plannedEndDate}
                            </span>
                            {action.responsible && (
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {action.responsible}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header com Gradiente */}
                <div className={`p-6 bg-gradient-to-r ${config.bgGradient} text-white relative overflow-hidden`}>
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                {config.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{config.title}</h2>
                                <p className="text-white/80 text-sm mt-1">{config.subtitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Métrica Principal */}
                    <div className="mt-6 flex items-end gap-2">
                        {type === 'conclusao' && (
                            <>
                                <span className="text-5xl font-bold">{completionRate}%</span>
                                <span className="text-white/70 mb-2">de conclusão ({completedActions}/{totalActions} ações)</span>
                            </>
                        )}
                        {type === 'risco' && (
                            <>
                                <span className="text-5xl font-bold">{overdueActions.length}</span>
                                <span className="text-white/70 mb-2">ações atrasadas</span>
                            </>
                        )}
                        {type === 'cobertura' && (
                            <>
                                <span className="text-5xl font-bold">{coverageRate}%</span>
                                <span className="text-white/70 mb-2">das microrregiões com ações</span>
                            </>
                        )}
                        {type === 'horizonte' && (
                            <>
                                <span className="text-5xl font-bold">{deadlineTotal}</span>
                                <span className="text-white/70 mb-2">ações no horizonte de entregas</span>
                            </>
                        )}
                        {type === 'status' && (
                            <>
                                <span className="text-5xl font-bold">{statusTotal}</span>
                                <span className="text-white/70 mb-2">ações na carteira</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {/* Taxa de Conclusão - Progresso por Objetivo */}
                    {type === 'conclusao' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-teal-600" />
                                Progresso por Objetivo
                            </h3>
                            {objectiveProgress.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">Nenhum objetivo encontrado</p>
                            ) : (
                                objectiveProgress.map(obj => (
                                    <div key={obj.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{obj.name}</span>
                                            <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                                {obj.completed}/{obj.total} ({obj.percentage}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${obj.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Risco de Prazo - Ações Atrasadas */}
                    {type === 'risco' && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500" />
                                Ações Atrasadas
                            </h3>
                            {overdueActions.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-slate-600 dark:text-slate-300 font-medium">Nenhuma ação atrasada!</p>
                                    <p className="text-slate-500 text-sm">Todas as ações estão dentro do prazo</p>
                                </div>
                            ) : (
                                overdueActions.map(action => (
                                    <div key={action.uid} className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                                        #{action.id}
                                                    </span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                                                        {action.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Prazo: {action.plannedEndDate}
                                                    </span>
                                                    {action.responsible && (
                                                        <span>Resp: {action.responsible}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                                                {action.daysOverdue} dias
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Cobertura Regional - Microrregiões */}
                    {type === 'cobertura' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    Status por Microrregião
                                </h3>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        Com ações
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                                        Sem ações
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {microCoverage.map(micro => (
                                    <div
                                        key={micro.id}
                                        className={`p-3 rounded-lg border transition-colors ${micro.hasActions
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
                                            : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-medium text-sm ${micro.hasActions
                                                ? 'text-emerald-800 dark:text-emerald-300'
                                                : 'text-slate-600 dark:text-slate-400'
                                                }`}>
                                                {micro.nome}
                                            </span>
                                            {micro.hasActions && (
                                                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {micro.actionCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                            {micro.macrorregiao}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Horizonte de Prazos - EXPANDÍVEL */}
                    {type === 'horizonte' && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-amber-600" />
                                Clique para ver as ações de cada período
                            </h3>
                            {deadlineHorizon.map((item, idx) => {
                                const percentage = deadlineTotal > 0 ? Math.round((item.value / deadlineTotal) * 100) : 0;
                                const isExpanded = expandedCategory === item.name;
                                const hasActions = item.actions && item.actions.length > 0;

                                return (
                                    <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={() => item.value > 0 && toggleCategory(item.name)}
                                            disabled={item.value === 0}
                                            className={`w-full p-4 text-left transition-all ${item.value > 0
                                                ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer'
                                                : 'cursor-default opacity-60'
                                                } ${isExpanded ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-slate-50 dark:bg-slate-700/30'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                                                    {item.value > 0 && (
                                                        isExpanded
                                                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: item.color }}>
                                                    {item.value} ações ({percentage}%)
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%`, backgroundColor: item.color }}
                                                />
                                            </div>
                                        </button>

                                        {/* Lista de Ações Expandida */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-600">
                                                <ActionList actions={item.actions} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {deadlineHorizon.length > 0 && deadlineHorizon[0].value > 0 && (
                                <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl">
                                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-semibold text-sm">Atenção!</span>
                                    </div>
                                    <p className="text-rose-600 dark:text-rose-400 text-sm mt-1">
                                        {deadlineHorizon[0].value} ação(ões) já está(ão) atrasada(s) e requer(em) ação imediata.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Global - EXPANDÍVEL */}
                    {type === 'status' && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                                <BarChart2 className="w-4 h-4 text-violet-600" />
                                Clique para ver as ações de cada status
                            </h3>
                            {statusData.map((item, idx) => {
                                const percentage = statusTotal > 0 ? Math.round((item.value / statusTotal) * 100) : 0;
                                const isExpanded = expandedCategory === item.name;

                                return (
                                    <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={() => item.value > 0 && toggleCategory(item.name)}
                                            disabled={item.value === 0}
                                            className={`w-full p-4 text-left transition-all ${item.value > 0
                                                ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer'
                                                : 'cursor-default opacity-60'
                                                } ${isExpanded ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-slate-50 dark:bg-slate-700/30'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                                                    {item.value > 0 && (
                                                        isExpanded
                                                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: item.color }}>
                                                    {item.value} ({percentage}%)
                                                </span>
                                            </div>
                                            <div className="mt-2 h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%`, backgroundColor: item.color }}
                                                />
                                            </div>
                                        </button>

                                        {/* Lista de Ações Expandida */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-600">
                                                <ActionList actions={item.actions} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Resumo Rápido */}
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center">
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {statusData.find(s => s.name === 'Concluídas')?.value || 0}
                                    </p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Concluídas</p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-center">
                                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                        {statusData.find(s => s.name === 'Atrasadas')?.value || 0}
                                    </p>
                                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">Atrasadas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-semibold transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
