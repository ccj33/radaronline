import type { ReactNode } from "react";

export type DashboardKpiTone = "amber" | "blue" | "emerald" | "slate" | "violet";

interface DashboardKpiCardProps {
    compact?: boolean;
    eyebrow?: string;
    icon: ReactNode;
    onClick?: () => void;
    title: string;
    tone: DashboardKpiTone;
    value: number | string;
}

function toneClasses(tone: DashboardKpiTone) {
    if (tone === "emerald") {
        return {
            accent: "from-emerald-500 via-teal-400 to-lime-300",
            dot: "bg-emerald-500",
            icon: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300",
            panel: "border-emerald-100/80 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-950/20",
        };
    }

    if (tone === "blue") {
        return {
            accent: "from-blue-500 via-indigo-400 to-cyan-300",
            dot: "bg-blue-500",
            icon: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300",
            panel: "border-blue-100/80 bg-blue-50/60 dark:border-blue-900/30 dark:bg-blue-950/20",
        };
    }

    if (tone === "amber") {
        return {
            accent: "from-orange-500 via-amber-400 to-yellow-300",
            dot: "bg-orange-500",
            icon: "border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300",
            panel: "border-orange-100/80 bg-orange-50/60 dark:border-orange-900/30 dark:bg-orange-950/20",
        };
    }

    if (tone === "violet") {
        return {
            accent: "from-violet-500 via-fuchsia-400 to-pink-300",
            dot: "bg-violet-500",
            icon: "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300",
            panel: "border-violet-100/80 bg-violet-50/60 dark:border-violet-900/30 dark:bg-violet-950/20",
        };
    }

    return {
        accent: "from-slate-700 via-slate-500 to-slate-300",
        dot: "bg-slate-500",
        icon: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
        panel: "border-slate-200/90 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-900/60",
    };
}

export function DashboardKpiCard({
    compact = false,
    eyebrow,
    icon,
    onClick,
    title,
    tone,
    value,
}: DashboardKpiCardProps) {
    const toneStyle = toneClasses(tone);

    return (
        <button
            className={`group relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white/95 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700/90 dark:bg-slate-800/95 dark:hover:border-slate-600 dark:hover:shadow-black/10 dark:focus:ring-slate-700 ${compact ? "min-h-[128px] p-4" : "min-h-[144px] p-4 lg:p-5"} ${onClick ? "cursor-pointer active:translate-y-0" : "cursor-default"}`}
            disabled={!onClick}
            onClick={onClick}
            type="button"
        >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${toneStyle.accent}`} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.08),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.06),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.08),transparent_28%)]" />

            <div className="relative z-10 flex h-full items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${toneStyle.dot}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            {eyebrow || "Indicador"}
                        </span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <h3 className={`${compact ? "mt-3 text-[2rem]" : "mt-4 text-[2.35rem]"} font-black tracking-tight text-slate-900 dark:text-slate-50`}>
                        {value}
                    </h3>
                </div>

                <div className={`flex items-center justify-center rounded-2xl border ${toneStyle.icon} ${compact ? "h-10 w-10" : "h-11 w-11"}`}>
                    {icon}
                </div>
            </div>
        </button>
    );
}
