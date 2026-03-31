import { Activity as ActivityIcon, AlertTriangle, Clock, Target } from "lucide-react";

import type { DashboardMetrics } from "./dashboard.types";
import { DashboardKpiCard } from "./DashboardKpiCard";

interface DashboardSetupMetrics {
    activeUsers: number;
    objectiveCount: number;
    pendingMembersCount: number;
    totalUsers: number;
}

interface DashboardKpiSectionProps {
    isMobile: boolean;
    metrics: DashboardMetrics;
    onCardClick: (status?: string) => void;
    onNavigateToList: () => void;
    onNavigateToTeam: () => void;
    setup?: DashboardSetupMetrics | null;
}

export function DashboardKpiSection({
    isMobile,
    metrics,
    onCardClick,
    onNavigateToList,
    onNavigateToTeam,
    setup,
}: DashboardKpiSectionProps) {
    const isSetupState = metrics.total === 0 && Boolean(setup);
    const cards = isSetupState && setup ? [
        {
            eyebrow: "Base",
            icon: <Target size={24} className="text-current" />,
            onClick: onNavigateToList,
            tone: "slate" as const,
            title: "Objetivos ativos",
            value: setup.objectiveCount,
        },
        {
            eyebrow: "Equipe",
            icon: <ActivityIcon size={24} className="text-current" />,
            onClick: onNavigateToTeam,
            tone: "emerald" as const,
            title: "Equipe ativa",
            value: `${setup.activeUsers}/${setup.totalUsers}`,
        },
        {
            eyebrow: "Cadastro",
            icon: <Clock size={24} className="text-current" />,
            onClick: onNavigateToTeam,
            tone: "blue" as const,
            title: "Pendencias",
            value: setup.pendingMembersCount,
        },
        {
            eyebrow: "Primeiro passo",
            icon: <AlertTriangle size={24} className="text-current" />,
            onClick: onNavigateToList,
            tone: "violet" as const,
            title: "Proximo movimento",
            value: "Planejar",
        },
    ] : [
        {
            eyebrow: "Total",
            icon: <Target size={24} className="text-current" />,
            onClick: onNavigateToList,
            tone: "slate" as const,
            title: "Total de acoes",
            value: metrics.total,
        },
        {
            eyebrow: "Ritmo",
            icon: <Clock size={24} className="text-current" />,
            onClick: () => onCardClick("Em Andamento"),
            tone: "blue" as const,
            title: "Em execucao",
            value: metrics.emAndamento,
        },
        {
            eyebrow: "Entrega",
            icon: <ActivityIcon size={24} className="text-current" />,
            onClick: () => onCardClick("Conclu\u00eddo"),
            tone: "emerald" as const,
            title: "Concluidas",
            value: metrics.concluidos,
        },
        {
            eyebrow: "Risco",
            icon: <AlertTriangle size={24} className="text-current" />,
            onClick: () => onCardClick("Atrasado"),
            tone: metrics.atrasados > 0 ? "amber" as const : "slate" as const,
            title: "Atencao necessaria",
            value: metrics.atrasados,
        },
    ];

    return (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`}>
            {cards.map((card) => (
                <DashboardKpiCard
                    key={card.title}
                    compact={isMobile}
                    eyebrow={card.eyebrow}
                    icon={card.icon}
                    onClick={card.onClick}
                    title={card.title}
                    tone={card.tone}
                    value={card.value}
                />
            ))}
        </div>
    );
}
