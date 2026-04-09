import { AlertTriangle, CalendarDays, CheckCircle2, PlayCircle, Target, TrendingDown, TrendingUp } from "lucide-react";

import type { MicroDetailInsights } from "../../../lib/microInsights";
import type { DashboardMetrics } from "./dashboard.types";

interface DashboardKpiSectionProps {
    insights?: MicroDetailInsights | null;
    isMobile: boolean;
    metrics: DashboardMetrics;
    onCardClick: (status?: string) => void;
    onNavigateToList: () => void;
    onNavigateToTeam: () => void;
}

interface KpiCardDef {
    bg: string;
    border: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    trendColor: string;
    trendDirection?: "up" | "down" | "stable";
    trendLabel?: string;
    value: number | string;
}

export function DashboardKpiSection({
    insights,
    isMobile,
    metrics,
    onCardClick,
    onNavigateToList,
}: DashboardKpiSectionProps) {
    const cards: KpiCardDef[] = [
        {
            bg: "bg-white dark:bg-slate-800",
            border: "border-slate-200 dark:border-slate-700",
            icon: <Target size={18} className="text-slate-500 dark:text-slate-400" />,
            label: "Total de Acoes",
            onClick: onNavigateToList,
            trendColor: "text-slate-600 dark:text-slate-400",
            trendDirection: "stable",
            trendLabel: `${metrics.percentConcluido}% concluido`,
            value: metrics.total,
        },
        {
            bg: "bg-white dark:bg-slate-800",
            border: "border-slate-200 dark:border-slate-700",
            icon: <PlayCircle size={18} className="text-blue-500 dark:text-blue-400" />,
            label: "Em Execucao",
            onClick: () => onCardClick("Em Andamento"),
            trendColor: insights?.averageProgress && insights.averageProgress > 30 ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400",
            trendDirection: insights?.averageProgress && insights.averageProgress > 50 ? "up" : "stable",
            trendLabel: insights?.averageProgress ? `${insights.averageProgress}% prog. medio` : undefined,
            value: metrics.emAndamento,
        },
        {
            bg: "bg-white dark:bg-slate-800",
            border: metrics.atrasados > 0 ? "border-orange-200 dark:border-orange-500/50" : "border-slate-200 dark:border-slate-700",
            icon: <AlertTriangle size={18} className={metrics.atrasados > 0 ? "text-orange-500 dark:text-orange-400" : "text-slate-400"} />,
            label: "Atrasadas",
            onClick: () => onCardClick("Atrasado"),
            trendColor: metrics.atrasados > 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-emerald-600 dark:text-emerald-400",
            trendDirection: metrics.atrasados > 0 ? "down" : "stable",
            trendLabel: metrics.atrasados > 0 ? `${Math.round((metrics.atrasados / Math.max(metrics.total, 1)) * 100)}% do planejamento` : "no prazo",
            value: metrics.atrasados,
        },
        {
            bg: "bg-white dark:bg-slate-800",
            border: "border-slate-200 dark:border-slate-700",
            icon: <CalendarDays size={18} className="text-indigo-500 dark:text-indigo-400" />,
            label: "Cadencia 30d",
            onClick: () => onCardClick("Concluído"),
            trendColor: insights?.trend?.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : insights?.trend?.direction === "down" ? "text-rose-600 dark:text-rose-400" : "text-slate-500",
            trendDirection: insights?.trend?.direction,
            trendLabel: insights?.trend?.previousPeriodCompleted !== undefined ? `vs ${insights.trend.previousPeriodCompleted} anterior` : "",
            value: insights?.trend?.currentPeriodCompleted ?? 0,
        },
    ];

    return (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
            {cards.map((card) => (
                <button
                    key={card.label}
                    className={`group flex flex-col justify-between overflow-hidden rounded-xl border ${card.border} ${card.bg} p-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 dark:hover:border-slate-600 dark:focus:ring-slate-600`}
                    onClick={card.onClick}
                    type="button"
                >
                    <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {card.label}
                        </span>
                        {card.icon}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">
                            {card.value}
                        </span>
                    </div>
                    {card.trendLabel && (
                        <div className={`mt-1 flex items-center gap-1 text-[11px] ${card.trendColor}`}>
                            {card.trendDirection === "up" && <TrendingUp size={12} />}
                            {card.trendDirection === "down" && <TrendingDown size={12} />}
                            {card.trendDirection === "stable" && <span className="opacity-70">—</span>}
                            <span>{card.trendLabel}</span>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}