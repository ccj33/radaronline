import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { BarChart2, PieChart as PieChartIcon, Sparkles, Target } from "lucide-react";

import { MobileProgressChart, MobileRingProgress, MobileStatusChart } from "../../../components/mobile";
import { DASHBOARD_COLORS } from "./dashboard.constants";
import { DashboardSafeResponsiveContainer } from "./DashboardSafeResponsiveContainer";
import type { DashboardMetrics, DashboardObjectiveProgressDatum } from "./dashboard.types";

interface DashboardChartsSectionProps {
    isMobile: boolean;
    metrics: DashboardMetrics;
    onNavigateObjective: (objectiveId: number) => void;
    onStatusClick: (status?: string) => void;
}

function DashboardStatusTooltip({ active, label, payload }: any) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <p className="font-bold text-slate-800 dark:text-slate-100">{label || payload[0].name}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{payload[0].value} acoes</p>
        </div>
    );
}

function DashboardObjectiveTooltip({ active, payload }: any) {
    if (!active || !payload?.[0]) {
        return null;
    }

    const data = payload[0].payload as DashboardObjectiveProgressDatum;
    return (
        <div className="max-w-[220px] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-1 font-bold text-slate-800 dark:text-slate-100">{data.fullName}</p>
            <div className="flex justify-between gap-4">
                <span>Progresso</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{data.progress}%</span>
            </div>
            <div className="mt-1 flex justify-between gap-4">
                <span>Acoes</span>
                <span className="font-bold">{data.count}</span>
            </div>
        </div>
    );
}

function percentage(value: number, total: number) {
    if (!total) {
        return 0;
    }

    return Math.round((value / total) * 100);
}

export function DashboardChartsSection({ isMobile, metrics, onNavigateObjective, onStatusClick }: DashboardChartsSectionProps) {
    const objectiveData = metrics.progressoPorObjetivo.filter((item) => item.count > 0);
    const strongestObjective = [...objectiveData].sort((left, right) => {
        if (right.progress !== left.progress) {
            return right.progress - left.progress;
        }

        return right.count - left.count;
    })[0];
    const weakestObjective = [...objectiveData].sort((left, right) => {
        if (left.progress !== right.progress) {
            return left.progress - right.progress;
        }

        return right.count - left.count;
    })[0];

    if (isMobile) {
        return (
            <div className="space-y-4">
                <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                <PieChartIcon size={16} className="text-teal-500" />
                                Leitura de status
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                Panorama rapido da carteira e onde o atraso esta aparecendo.
                            </p>
                        </div>
                        <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-300">
                            {metrics.total} acoes
                        </span>
                    </div>
                    <div className="mt-4 flex items-center justify-around">
                        <MobileRingProgress
                            color={DASHBOARD_COLORS.teal}
                            label="Conclusao"
                            size="lg"
                            sublabel={`${metrics.concluidos}/${metrics.total} acoes`}
                            value={metrics.percentConcluido}
                        />
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <MobileStatusChart data={metrics.statusData} onItemClick={onStatusClick} total={metrics.total} />
                    </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                <Target size={16} className="text-teal-500" />
                                Objetivos em execucao
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                Toque em um objetivo para abrir a lista filtrada.
                            </p>
                        </div>
                        {strongestObjective ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                Melhor: {strongestObjective.name}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <MobileProgressChart data={metrics.progressoPorObjetivo} onItemClick={onNavigateObjective} />
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.92fr),minmax(0,1.08fr)]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                            <PieChartIcon size={18} className="text-teal-500" />
                            Distribuicao de status
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Clique em uma faixa para abrir a lista no status correspondente.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">carteira</div>
                        <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{metrics.total}</div>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr),220px] lg:items-center">
                    <div className="relative h-[260px]">
                        {metrics.statusData.length > 0 ? (
                            <>
                                <DashboardSafeResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            className="cursor-pointer"
                                            cx="50%"
                                            cy="50%"
                                            data={metrics.statusData}
                                            dataKey="value"
                                            innerRadius={72}
                                            outerRadius={96}
                                            onClick={(data) => onStatusClick(data.name)}
                                            paddingAngle={4}
                                            stroke="none"
                                        >
                                            {metrics.statusData.map((entry, index) => (
                                                <Cell key={`status-${index}`} className="cursor-pointer transition-opacity hover:opacity-80" fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<DashboardStatusTooltip />} />
                                    </PieChart>
                                </DashboardSafeResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">{metrics.total}</span>
                                    <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">acoes</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                                Sem dados para exibir
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {metrics.statusData.map((item) => (
                            <button
                                key={item.name}
                                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                                onClick={() => onStatusClick(item.name)}
                                type="button"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{percentage(item.value, metrics.total)}% da carteira</div>
                                    </div>
                                </div>
                                <div className="text-lg font-black text-slate-900 dark:text-slate-50">{item.value}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                            <BarChart2 size={18} className="text-teal-500" />
                            Performance por objetivo
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Veja onde a micro esta avancando e onde precisa puxar prioridade.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {strongestObjective ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                <Sparkles size={14} />
                                Melhor {strongestObjective.name} - {strongestObjective.progress}%
                            </span>
                        ) : null}
                        {weakestObjective ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                Atencao {weakestObjective.name} - {weakestObjective.progress}%
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="mb-4 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">objetivos ativos</div>
                            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{objectiveData.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">topo</div>
                            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                                {strongestObjective ? `${strongestObjective.fullName} - ${strongestObjective.progress}%` : "Sem dados"}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">clicavel</div>
                            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-50">Clique na barra para abrir a lista</div>
                        </div>
                    </div>

                    <div className="h-[290px]">
                        {metrics.progressoPorObjetivo.length > 0 ? (
                            <DashboardSafeResponsiveContainer>
                                <BarChart
                                    className="cursor-pointer"
                                    data={metrics.progressoPorObjetivo}
                                    layout="vertical"
                                    margin={{ bottom: 5, left: 10, right: 16, top: 8 }}
                                    onClick={(data: any) => {
                                        const objectiveId = data?.activePayload?.[0]?.payload?.id;
                                        if (objectiveId) {
                                            onNavigateObjective(objectiveId);
                                        }
                                    }}
                                >
                                    <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.22)" strokeDasharray="4 4" />
                                    <XAxis domain={[0, 100]} hide type="number" />
                                    <YAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} type="category" width={52} />
                                    <RechartsTooltip content={<DashboardObjectiveTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                                    <Bar barSize={22} className="cursor-pointer" dataKey="progress" radius={[0, 8, 8, 0]}>
                                        {metrics.progressoPorObjetivo.map((entry, index) => (
                                            <Cell
                                                key={`objective-${index}`}
                                                className="transition-opacity hover:opacity-85"
                                                fill={entry.progress === 100 ? DASHBOARD_COLORS.concluido : entry.progress >= 60 ? DASHBOARD_COLORS.teal : DASHBOARD_COLORS.violet}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </DashboardSafeResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                                Sem dados para exibir
                            </div>
                        )}
                    </div>
                </div>

                {objectiveData.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {objectiveData.slice(0, 2).map((item) => (
                            <button
                                key={item.id}
                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                                onClick={() => onNavigateObjective(item.id)}
                                type="button"
                            >
                                <div>
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.fullName}</div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.count} acoes vinculadas</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-slate-900 dark:text-slate-50">{item.progress}%</div>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">progresso</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
