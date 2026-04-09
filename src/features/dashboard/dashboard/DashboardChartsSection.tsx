import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { BarChart2, PieChart as PieChartIcon, Sparkles } from "lucide-react";

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
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

export function DashboardChartsSection({ isMobile, metrics, onNavigateObjective, onStatusClick }: DashboardChartsSectionProps) {
    const objectiveData = metrics.progressoPorObjetivo.filter((item) => item.count > 0);
    const strongestObjective = [...objectiveData].sort((left, right) => {
        if (right.progress !== left.progress) return right.progress - left.progress;
        return right.count - left.count;
    })[0];
    const weakestObjective = [...objectiveData].sort((left, right) => {
        if (left.progress !== right.progress) return left.progress - right.progress;
        return right.count - left.count;
    })[0];

    if (isMobile) {
        return (
            <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <PieChartIcon size={16} className="text-teal-500" />
                        Distribuicao de status
                    </h3>
                    <div className="mt-4 flex items-center justify-around">
                        <MobileRingProgress
                            color={DASHBOARD_COLORS.teal}
                            label="Conclusao"
                            size="lg"
                            sublabel={`${metrics.concluidos}/${metrics.total} acoes`}
                            value={metrics.percentConcluido}
                        />
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <MobileStatusChart data={metrics.statusData} onItemClick={onStatusClick} total={metrics.total} />
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <BarChart2 size={16} className="text-teal-500" />
                        Performance por objetivo
                    </h3>
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <MobileProgressChart data={metrics.progressoPorObjetivo} onItemClick={onNavigateObjective} />
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Status Distribution - Horizontal Bars */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                        <PieChartIcon size={18} className="text-teal-500" />
                        Distribuicao de status
                    </h3>
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-black text-slate-900 dark:bg-slate-700 dark:text-slate-50">
                        {metrics.total}
                    </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Clique em uma faixa para filtrar a lista.
                </p>

                <div className="mt-6 space-y-4">
                    {metrics.statusData.length > 0 ? (
                        metrics.statusData.map((item) => (
                            <button
                                key={item.name}
                                className="group w-full text-left outline-none rounded-lg focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                                onClick={() => onStatusClick(item.name)}
                                type="button"
                            >
                                <div className="mb-1.5 flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        {item.name}
                                    </span>
                                    <span className="tabular-nums font-bold text-slate-900 dark:text-slate-50">
                                        {item.value}
                                        <span className="ml-1 text-xs font-medium text-slate-400">({percentage(item.value, metrics.total)}%)</span>
                                    </span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                                        style={{ backgroundColor: item.color, width: `${Math.max(percentage(item.value, metrics.total), 2)}%` }}
                                    />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                            Sem dados para exibir
                        </div>
                    )}
                </div>
            </section>

            {/* Objectives Performance */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                        <BarChart2 size={18} className="text-teal-500" />
                        Performance por objetivo
                    </h3>
                    <div className="flex gap-2">
                        {strongestObjective ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <Sparkles size={11} />
                                {strongestObjective.name} {strongestObjective.progress}%
                            </span>
                        ) : null}
                    </div>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Clique na barra para filtrar por objetivo.
                </p>

                <div className="mt-5 h-[260px]">
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
                                <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="4 4" />
                                <XAxis domain={[0, 100]} hide type="number" />
                                <YAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} type="category" width={52} />
                                <RechartsTooltip content={<DashboardObjectiveTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.06)" }} />
                                <Bar barSize={20} className="cursor-pointer" dataKey="progress" radius={[0, 8, 8, 0]}>
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
                        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                            Sem dados para exibir
                        </div>
                    )}
                </div>

                {weakestObjective && strongestObjective && weakestObjective.id !== strongestObjective.id ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-left transition-colors hover:bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                            onClick={() => onNavigateObjective(strongestObjective.id)}
                            type="button"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Melhor</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{strongestObjective.fullName}</div>
                            <div className="mt-0.5 text-lg font-black text-emerald-700 dark:text-emerald-300">{strongestObjective.progress}%</div>
                        </button>
                        <button
                            className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-left transition-colors hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                            onClick={() => onNavigateObjective(weakestObjective.id)}
                            type="button"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">Atencao</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{weakestObjective.fullName}</div>
                            <div className="mt-0.5 text-lg font-black text-amber-700 dark:text-amber-300">{weakestObjective.progress}%</div>
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
