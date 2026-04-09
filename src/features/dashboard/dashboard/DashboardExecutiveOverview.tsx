import { AlertTriangle, ArrowRight, ShieldAlert, Sparkles, Building2 } from "lucide-react";

import type { MicroAlert, MicroDetailInsights } from "../../../lib/microInsights";

export interface DashboardExecutiveOperations {
    actionsWithoutResponsible: number;
    lateActionsWithoutResponsible: number;
    objectiveCount: number;
    objectivesWithActions: number;
    pendingMembersCount: number;
}

interface DashboardExecutiveOverviewProps {
    insights: MicroDetailInsights | null;
    isMobile: boolean;
    macroName?: string | null;
    microName: string;
    operations: DashboardExecutiveOperations;
    urs?: string | null;
}

function toneAlertStyle(tone: MicroAlert["tone"]) {
    if (tone === "critical") return "border-orange-500 bg-orange-50 text-orange-800 dark:border-orange-500/50 dark:bg-orange-950/40 dark:text-orange-200";
    if (tone === "warning") return "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200";
    if (tone === "positive") return "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-200";
    return "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function toneIcon(tone: MicroAlert["tone"]) {
    if (tone === "critical") return <ShieldAlert size={18} className="text-orange-600 dark:text-orange-400" />;
    if (tone === "warning") return <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />;
    if (tone === "positive") return <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />;
    return <Building2 size={18} className="text-slate-500 dark:text-slate-400" />;
}

export function DashboardExecutiveOverview({
    insights,
    isMobile,
}: DashboardExecutiveOverviewProps) {
    if (!insights) {
        return null;
    }

    const { recommendation } = insights;

    // Only show if it's a warning or critical recommendation
    if (recommendation.tone !== "critical" && recommendation.tone !== "warning") {
        return null; // Or show a very subtle positive banner
    }

    return (
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border-l-4 py-3 px-4 shadow-sm ${toneAlertStyle(recommendation.tone)}`}>
            <div className="flex items-center gap-3">
                <span className="shrink-0">
                    {toneIcon(recommendation.tone)}
                </span>
                <div>
                    <h3 className="text-sm font-bold leading-tight">
                        {recommendation.title}
                    </h3>
                    <p className="mt-0.5 text-xs opacity-90">
                        {recommendation.description}
                    </p>
                </div>
            </div>
            {/* Optional action button or link could go here */}
        </div>
    );
}
