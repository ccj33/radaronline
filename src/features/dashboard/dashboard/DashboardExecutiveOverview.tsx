import {
    AlertTriangle,
    BarChart3,
    Building2,
    CalendarClock,
    Minus,
    ShieldAlert,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react";

import { Tooltip } from "../../../components/common/Tooltip";
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

function toneClasses(tone: MicroAlert["tone"]) {
    if (tone === "critical") {
        return {
            badge: "border-orange-200 bg-orange-100/90 text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300",
            card: "border-orange-200 bg-orange-50/90 dark:border-orange-900/40 dark:bg-orange-900/10",
            ring: "#f97316",
            text: "text-orange-600 dark:text-orange-300",
        };
    }

    if (tone === "warning") {
        return {
            badge: "border-amber-200 bg-amber-100/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300",
            card: "border-amber-200 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-900/10",
            ring: "#f59e0b",
            text: "text-amber-600 dark:text-amber-300",
        };
    }

    if (tone === "positive") {
        return {
            badge: "border-emerald-200 bg-emerald-100/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300",
            card: "border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-900/10",
            ring: "#10b981",
            text: "text-emerald-600 dark:text-emerald-300",
        };
    }

    return {
        badge: "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        card: "border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/50",
        ring: "#64748b",
        text: "text-slate-600 dark:text-slate-300",
    };
}

function toneIcon(tone: MicroAlert["tone"]) {
    if (tone === "critical") return <ShieldAlert size={18} />;
    if (tone === "warning") return <AlertTriangle size={18} />;
    if (tone === "positive") return <Sparkles size={18} />;
    return <BarChart3 size={18} />;
}

function trendIcon(direction: "up" | "down" | "stable") {
    if (direction === "up") return <TrendingUp size={18} />;
    if (direction === "down") return <TrendingDown size={18} />;
    return <Minus size={18} />;
}

function daysLabel(daysRemaining: number) {
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d de atraso`;
    if (daysRemaining === 0) return "vence hoje";
    if (daysRemaining === 1) return "vence amanha";
    return `${daysRemaining} dias`;
}

function formatScoreValue(value: number) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function buildScoreBreakdown(insights: MicroDetailInsights) {
    if (insights.totalActions === 0) {
        return {
            rawScore: 0,
            rows: [
                { contribution: 0, label: "Conclusao", value: 0, weight: 45 },
                { contribution: 0, label: "Progresso medio", value: 0, weight: 20 },
                { contribution: 0, label: "Prazo sem atraso", value: 0, weight: 25 },
                { contribution: 0, label: "Cobertura com responsavel", value: 0, weight: 10 },
            ],
        };
    }

    const delayRate = (insights.statusBreakdown.late / insights.totalActions) * 100;
    const deadlineHealth = Math.max(0, 100 - delayRate);
    const rows = [
        {
            contribution: insights.completionRate * 0.45,
            label: "Conclusao",
            value: insights.completionRate,
            weight: 45,
        },
        {
            contribution: insights.averageProgress * 0.2,
            label: "Progresso medio",
            value: insights.averageProgress,
            weight: 20,
        },
        {
            contribution: deadlineHealth * 0.25,
            label: "Prazo sem atraso",
            value: Math.round(deadlineHealth),
            weight: 25,
        },
        {
            contribution: insights.responsibleCoverage * 0.1,
            label: "Cobertura com responsavel",
            value: insights.responsibleCoverage,
            weight: 10,
        },
    ];

    return {
        rawScore: rows.reduce((sum, row) => sum + row.contribution, 0),
        rows,
    };
}

export function DashboardExecutiveOverview({
    insights,
    isMobile,
    macroName,
    microName,
    operations,
    urs,
}: DashboardExecutiveOverviewProps) {
    if (!insights) {
        return null;
    }

    const healthTone = toneClasses(insights.healthScore.tone);
    const benchmarkTone = toneClasses(
        insights.benchmark?.direction === "above"
            ? "positive"
            : insights.benchmark?.direction === "below"
                ? "warning"
                : "neutral",
    );
    const objectivesWithoutActions = Math.max(operations.objectiveCount - operations.objectivesWithActions, 0);
    const firstUpcomingAction = insights.upcomingActions[0];
    const scoreBreakdown = buildScoreBreakdown(insights);

    const statCards = [
        {
            label: "Conclusao",
            value: `${insights.completionRate}%`,
            helper: `${insights.statusBreakdown.completed} entregas concluidas`,
        },
        {
            label: "Progresso medio",
            value: `${insights.averageProgress}%`,
            helper: `${insights.statusBreakdown.inProgress} em execucao`,
        },
        {
            label: "Cobertura",
            value: `${insights.responsibleCoverage}%`,
            helper: "acoes com responsavel definido",
        },
        {
            label: "Cadencia 30d",
            value: insights.trend.currentPeriodCompleted,
            helper: "conclusoes nos ultimos 30 dias",
        },
    ];
    const governanceItems = [
        {
            helper: operations.pendingMembersCount > 0
                ? `${operations.pendingMembersCount} cadastros pendentes`
                : "sem pendencias de acesso",
            icon: <Users size={16} />,
            label: "Equipe pronta",
            value: `${insights.activeUsers}/${insights.totalUsers}`,
        },
        {
            helper: operations.actionsWithoutResponsible > 0
                ? `${operations.actionsWithoutResponsible} acoes abertas sem dono`
                : "todas com responsavel definido",
            icon: <ShieldAlert size={16} />,
            label: "Sem responsavel",
            value: operations.actionsWithoutResponsible,
        },
        {
            helper: firstUpcomingAction
                ? `proxima janela: ${daysLabel(firstUpcomingAction.daysRemaining)}`
                : "nenhum vencimento imediato",
            icon: <CalendarClock size={16} />,
            label: "Prazos em 7d",
            value: insights.upcomingActions.length,
        },
        {
            helper: operations.lateActionsWithoutResponsible > 0
                ? `${operations.lateActionsWithoutResponsible} sem dono`
                : insights.statusBreakdown.late > 0
                    ? "todas as atrasadas tem responsavel"
                    : "sem atraso aberto",
            icon: <AlertTriangle size={16} />,
            label: "Atrasadas",
            value: insights.statusBreakdown.late,
        },
    ];
    const showAlertGrid = insights.totalActions > 0;

    return (
        <div className="space-y-4">
            <div className={`grid gap-4 ${isMobile ? "" : "xl:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]"}`}>
                <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.4),transparent)]" />
                    <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
                        <div className="mx-auto lg:mx-0">
                            <Tooltip
                                content={(
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                            Como calculamos
                                        </div>
                                        {insights.totalActions === 0 ? (
                                            <div className="text-[11px] leading-5 text-slate-100">
                                                O score fica em 0 enquanto a micro ainda nao tem acoes suficientes.
                                                Quando houver carteira, a nota considera conclusao (45%), progresso medio (20%),
                                                prazo sem atraso (25%) e cobertura com responsavel (10%).
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-[11px] leading-5 text-slate-100">
                                                {scoreBreakdown.rows.map((row) => (
                                                    <div key={row.label} className="flex items-start justify-between gap-3">
                                                        <span>{row.label}: {row.value}% x {row.weight}%</span>
                                                        <span className="font-semibold text-white">{formatScoreValue(row.contribution)} pts</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 pt-2 text-[11px] font-semibold text-white">
                                            Nota final: {formatScoreValue(scoreBreakdown.rawScore)} arredondada para {insights.healthScore.score}
                                        </div>
                                    </div>
                                )}
                                delay={120}
                                position={isMobile ? "bottom" : "right"}
                            >
                                <div
                                    aria-label="Como o score operacional e calculado"
                                    className="flex h-32 w-32 shrink-0 cursor-help items-center justify-center rounded-full p-3 shadow-inner outline-none"
                                    style={{ background: `conic-gradient(${healthTone.ring} ${insights.healthScore.score}%, rgba(148,163,184,0.18) 0)` }}
                                    tabIndex={0}
                                >
                                    <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-900">
                                        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{insights.healthScore.score}</span>
                                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">score</span>
                                    </div>
                                </div>
                            </Tooltip>
                        </div>

                        <div className="flex-1">
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-300">
                                    <Building2 size={14} />
                                    Microrregiao analisada: {microName}
                                </span>
                                {macroName ? (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        Macro {macroName}
                                    </span>
                                ) : null}
                                {urs ? (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        URS {urs}
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-4">
                                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                                    Saude operacional da sua microrregiao
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">
                                    {insights.healthScore.summary}
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                                {statCards.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/70"
                                    >
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            {stat.label}
                                        </div>
                                        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{stat.value}</div>
                                        <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{stat.helper}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${healthTone.badge}`}>
                                {trendIcon(insights.trend.direction)}
                            </span>
                            Ritmo recente
                        </div>
                        <div className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-50">
                            {insights.trend.currentPeriodCompleted} concluidas em 30d
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {insights.totalActions > 0
                                ? `${insights.trend.previousPeriodCompleted} no periodo anterior e ${insights.statusBreakdown.late} atrasadas abertas agora.`
                                : `${operations.objectiveCount} objetivos disponiveis e nenhuma acao registrada na micro.`}
                        </p>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${benchmarkTone.badge}`}>
                                <Target size={16} />
                            </span>
                            {insights.benchmark ? "Comparativo macro" : "Cobertura dos objetivos"}
                        </div>
                        {insights.benchmark ? (
                            <>
                                <div className={`mt-3 text-lg font-black ${benchmarkTone.text}`}>
                                    {insights.benchmark.rank} de {insights.benchmark.totalPeers}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {insights.benchmark.direction === "above" ? "Acima" : insights.benchmark.direction === "below" ? "Abaixo" : "Alinhada"} da media da {insights.benchmark.macroName}
                                    {`. `}
                                    {insights.benchmark.differenceFromMacro > 0 ? "+" : ""}
                                    {insights.benchmark.differenceFromMacro} pts no score.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mt-3 text-lg font-black text-slate-900 dark:text-slate-50">
                                    {operations.objectivesWithActions}/{operations.objectiveCount}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {objectivesWithoutActions > 0
                                        ? `${objectivesWithoutActions} objetivos ainda sem acao registrada.`
                                        : "todos os objetivos ja possuem ao menos uma acao vinculada."}
                                </p>
                            </>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:col-span-2">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300">
                                <ShieldAlert size={16} />
                            </span>
                            Governanca da execucao
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {governanceItems.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
                                >
                                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </div>
                                    <div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">{item.value}</div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        {item.helper}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {showAlertGrid ? (
                <div className={`grid gap-3 ${isMobile ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
                    {insights.alerts.map((alert) => {
                        const tone = toneClasses(alert.tone);
                        return (
                            <section key={alert.id} className={`rounded-2xl border p-4 shadow-sm ${tone.card}`}>
                                <div className="flex items-start gap-3">
                                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone.badge}`}>
                                        {toneIcon(alert.tone)}
                                    </span>
                                    <div>
                                        <div className="font-semibold text-slate-900 dark:text-slate-50">{alert.title}</div>
                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{alert.description}</p>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
