import { useMemo, useState } from "react";

import { Award, Calendar, CheckCircle2, Clock, Crosshair, Users } from "lucide-react";

import { getDerivedActionStatus, getUpcomingActions } from "../../../lib/actionPortfolio";
import { formatDateBr, parseDateLocal } from "../../../lib/date";
import type { MicroDetailInsights } from "../../../lib/microInsights";
import { getActionDisplayId } from "../../../lib/text";
import type { Action } from "../../../types";

interface DashboardSummaryPanelsProps {
    actions: Action[];
    insights: MicroDetailInsights | null;
    isMobile: boolean;
}

function responsibleName(action: Action): string | undefined {
    return action.raci?.find((member) => member.role === "R")?.name;
}

function statusClasses(status: Action["status"]) {
    if (status === "Conclu\u00eddo") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300";
    if (status === "Atrasado") return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300";
    if (status === "Em Andamento") return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function daysLabel(daysRemaining: number) {
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d de atraso`;
    if (daysRemaining === 0) return "vence hoje";
    if (daysRemaining === 1) return "vence amanha";
    return `${daysRemaining} dias`;
}

const DEADLINE_WINDOWS = [7, 15, 30] as const;

export function DashboardSummaryPanels({ actions, insights, isMobile }: DashboardSummaryPanelsProps) {
    const [deadlineWindow, setDeadlineWindow] = useState<(typeof DEADLINE_WINDOWS)[number]>(7);
    const upcomingItems = useMemo(() => {
        const today = new Date();

        return getUpcomingActions(actions, today, deadlineWindow, 4).map((action) => {
            const dueDate = action.plannedEndDate || action.endDate;
            const plannedDate = parseDateLocal(dueDate);
            const daysRemaining = plannedDate
                ? Math.ceil((plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                daysRemaining,
                displayId: getActionDisplayId(action.id),
                plannedEndDate: dueDate,
                responsible: responsibleName(action),
                status: getDerivedActionStatus(action, today),
                title: action.title,
                uid: action.uid,
            };
        });
    }, [actions, deadlineWindow]);
    const focusItems = insights?.focusActions.slice(0, 4) || [];

    return (
        <div className={`grid grid-cols-1 ${isMobile ? "gap-4" : "gap-6 lg:grid-cols-2"}`}>
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                        <Clock size={18} className="text-amber-500" />
                        Proximos prazos ({deadlineWindow} dias)
                    </h3>
                    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
                        {DEADLINE_WINDOWS.map((windowDays) => (
                            <button
                                key={windowDays}
                                aria-pressed={deadlineWindow === windowDays}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    deadlineWindow === windowDays
                                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                }`}
                                onClick={() => setDeadlineWindow(windowDays)}
                                type="button"
                            >
                                {windowDays}d
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    {upcomingItems.length > 0 ? upcomingItems.map((action) => (
                        <div key={action.uid} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                                            {action.displayId}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${statusClasses(action.status)}`}>
                                            {action.status}
                                        </span>
                                    </div>
                                    <p className="mt-3 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{action.title}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {formatDateBr(action.plannedEndDate)}
                                        </span>
                                        <span>{action.responsible || "Sem responsavel"}</span>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-amber-100 bg-white px-3 py-2 text-right shadow-sm dark:border-amber-900/30 dark:bg-slate-800">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">janela</div>
                                    <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">{daysLabel(action.daysRemaining)}</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-600 dark:bg-slate-700/50">
                            <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
                            <p className="font-medium text-slate-600 dark:text-slate-300">Tudo tranquilo!</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma entrega urgente para os proximos {deadlineWindow} dias.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
                    <Crosshair size={18} className="text-violet-500" />
                    Carteira em foco
                </h3>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    As acoes que merecem acompanhamento direto antes de virarem gargalo.
                </p>
                <div className="space-y-3">
                    {focusItems.length > 0 ? focusItems.map((action) => {
                        const status = getDerivedActionStatus(action);
                        const responsible = responsibleName(action);

                        return (
                            <div key={action.uid} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-white dark:bg-slate-50 dark:text-slate-900">
                                        {getActionDisplayId(action.id)}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${statusClasses(status)}`}>
                                        {status}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        {action.progress}% progresso
                                    </span>
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{action.title}</p>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span>{responsible || "Sem responsavel"}</span>
                                    <span>{action.plannedEndDate ? `Prazo ${formatDateBr(action.plannedEndDate)}` : "Prazo nao definido"}</span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-600 dark:bg-slate-700/50">
                            <Users size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-500" />
                            <p className="text-sm italic text-slate-400 dark:text-slate-500">Nenhuma acao em foco no momento.</p>
                        </div>
                    )}
                </div>

                {insights?.topPerformer ? (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
                        <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm dark:bg-slate-800 dark:text-violet-300">
                                <Award size={18} />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">Destaque da micro</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{insights.topPerformer.name}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {insights.topPerformer.completedCount} entregas concluidas e {insights.topPerformer.assignedCount} acoes acompanhadas.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
