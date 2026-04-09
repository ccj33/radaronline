import { Bar, BarChart, Cell, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";

import { DashboardSafeResponsiveContainer } from "./DashboardSafeResponsiveContainer";
import type { MicroDetailInsights } from "../../../lib/microInsights";

interface DashboardHealthRadarProps {
    insights: MicroDetailInsights | null;
    isMobile: boolean;
}

/**
 * Cores por psicologia básica de dados:
 * - Verde: conclusão / êxito
 * - Azul: execução em curso (progresso)
 * - Índigo: cobertura / vínculo (responsáveis)
 * - Teal: pontualidade / confiabilidade (sem atrasos)
 * - Âmbar: ritmo / energia (eficiência) — alerta suave, não vermelho
 */
const METRIC_ROWS: { key: string; label: string; hint: string; fill: string }[] = [
    { key: "conclusao", label: "Conclusão", hint: "% de ações finalizadas.", fill: "#10b981" },
    { key: "progresso", label: "Progresso", hint: "Avanço médio reportado nas ações.", fill: "#3b82f6" },
    { key: "cobertura", label: "Cobertura", hint: "Ações com responsável definido.", fill: "#6366f1" },
    { key: "prazo", label: "Pontualidade", hint: "% sem atraso (prazo vs hoje).", fill: "#14b8a6" },
    { key: "eficiencia", label: "Eficiência", hint: "Concluídas entre as em movimento.", fill: "#f59e0b" },
];

export function DashboardHealthRadar({ insights, isMobile }: DashboardHealthRadarProps) {
    if (!insights || insights.totalActions === 0) {
        return (
            <section className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Activity size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sem dados para o painel</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 text-center px-4">
                    Cadastre ações para visualizar a saúde do plano de ação.
                </p>
            </section>
        );
    }

    const completionRate = insights.completionRate || 0;
    const averageProgress = insights.averageProgress || 0;
    const responsibleCoverage = insights.responsibleCoverage || 0;
    const totalActions = insights.totalActions || 1;
    const statusBreakdown = insights.statusBreakdown || { completed: 0, inProgress: 0, notStarted: 0, late: 0 };

    const punctuality = Math.max(0, 100 - Math.round((statusBreakdown.late / totalActions) * 100));

    const activeActions = statusBreakdown.completed + statusBreakdown.inProgress;
    const teamEfficiency = activeActions > 0 ? Math.round((statusBreakdown.completed / activeActions) * 100) : 0;

    const values = [completionRate, averageProgress, responsibleCoverage, punctuality, teamEfficiency];

    const chartData = METRIC_ROWS.map((row, i) => ({
        name: row.label,
        value: Math.min(100, Math.max(0, values[i] ?? 0)),
        fill: row.fill,
    }));

    const avgIndex = Math.round(values.reduce((a, v) => a + v, 0) / values.length);

    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                        <Activity size={16} className="text-teal-500" />
                        Saude do Plano de Ação
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Cinco indicadores <span className="font-semibold text-slate-600 dark:text-slate-300">independentes</span>
                        {" "}(cada um 0–100%). Não somam 100% juntos: cada barra mede uma frente diferente do plano.
                    </p>
                </div>
                <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right dark:border-slate-600 dark:bg-slate-900/40">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Média</div>
                    <div className="text-xl font-black tabular-nums text-slate-800 dark:text-slate-100">{avgIndex}%</div>
                </div>
            </div>

            <div className="mt-3 flex-1 min-h-[260px] w-full">
                <DashboardSafeResponsiveContainer>
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{
                            left: isMobile ? 4 : 8,
                            right: isMobile ? 28 : 36,
                            top: 4,
                            bottom: 4,
                        }}
                        barCategoryGap="18%"
                    >
                        <XAxis
                            axisLine={false}
                            domain={[0, 100]}
                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                            tickLine={false}
                            ticks={[0, 25, 50, 75, 100]}
                            type="number"
                        />
                        <YAxis
                            axisLine={false}
                            dataKey="name"
                            tick={{ fill: "#64748b", fontSize: isMobile ? 10 : 11, fontWeight: 600 }}
                            tickLine={false}
                            type="category"
                            width={isMobile ? 78 : 92}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                borderRadius: "12px",
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            formatter={(value: number | undefined) => [
                                `${typeof value === "number" ? value : 0}%`,
                                "Indicador",
                            ]}
                            labelStyle={{ fontWeight: 700 }}
                        />
                        <Bar background={{ fill: "rgba(148, 163, 184, 0.12)" }} dataKey="value" radius={[0, 6, 6, 0]} barSize={isMobile ? 16 : 20}>
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </DashboardSafeResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-[10px] leading-snug text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 sm:grid-cols-2">
                {METRIC_ROWS.map((row) => (
                    <div key={row.key} className="flex items-start gap-2">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                        <span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{row.label}:</span> {row.hint}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
