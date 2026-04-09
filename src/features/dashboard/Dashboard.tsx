import React, { useMemo, useState } from "react";

import { useAuth } from "../../auth";
import { StrategicReportGenerator } from "../../components/reports/StrategicReportGenerator";
import { getMicroregiaoById } from "../../data/microregioes";
import { useResponsive } from "../../hooks/useMediaQuery";
import { filterActionsByObjective, getDerivedActionStatus } from "../../lib/actionPortfolio";
import { buildMicroDetailInsights } from "../../lib/microInsights";
import { ActionDetailModal } from "../actions/ActionDetailModal";
import { DashboardChartsSection } from "./dashboard/DashboardChartsSection";
import { DashboardExecutiveOverview } from "./dashboard/DashboardExecutiveOverview";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardKpiSection } from "./dashboard/DashboardKpiSection";
import { DashboardHealthRadar } from "./dashboard/DashboardHealthRadar";
import { DashboardTeamCapacity } from "./dashboard/DashboardTeamCapacity";
import { DashboardPendingMembersAlert } from "./dashboard/DashboardPendingMembersAlert";
import { DashboardSummaryPanels } from "./dashboard/DashboardSummaryPanels";
import type { DashboardProps } from "./dashboard/dashboard.types";
import { useDashboardMetrics } from "./dashboard/useDashboardMetrics";

export const Dashboard: React.FC<DashboardProps> = ({
    actions,
    activities,
    currentMicroId,
    currentMicroLabel,
    objectives,
    onNavigate,
    team,
}) => {
    const { user } = useAuth();
    const { isMobile } = useResponsive();
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
    const resolvedMicroId = currentMicroId || "all";

    const selectedAction = useMemo(() => {
        if (!selectedActionId) return null;
        return actions.find((a) => a.uid === selectedActionId || a.id === selectedActionId) || null;
    }, [actions, selectedActionId]);
    const micro = useMemo(
        () => (resolvedMicroId && resolvedMicroId !== "all" ? getMicroregiaoById(resolvedMicroId) || null : null),
        [resolvedMicroId],
    );
    const resolvedMicroName = currentMicroLabel || micro?.nome || (resolvedMicroId === "all" ? "Estado de Minas Gerais" : "Microrregiao");
    const insightUsers = useMemo(
        () => team.map((member) => ({
            ativo: member.isRegistered !== false,
            microregiaoId: member.microregiaoId,
        })),
        [team],
    );
    const executiveInsights = useMemo(
        () => (resolvedMicroId ? buildMicroDetailInsights(resolvedMicroId, actions, insightUsers) : null),
        [actions, insightUsers, resolvedMicroId],
    );

    const { metrics, pendingMembers, showPendingMembers } = useDashboardMetrics({
        actions,
        activities,
        objectives,
        team,
        user,
    });
    const executiveOperations = useMemo(() => {
        const objectivesWithActions = objectives.filter((objective) => {
            return filterActionsByObjective(actions, activities, objective.id).length > 0;
        }).length;

        const actionsWithoutResponsible = actions.filter((action) => {
            return getDerivedActionStatus(action) !== "Concluído"
                && !action.raci?.some((member) => member.role === "R");
        }).length;

        const lateActionsWithoutResponsible = actions.filter((action) => {
            return getDerivedActionStatus(action) === "Atrasado"
                && !action.raci?.some((member) => member.role === "R");
        }).length;

        return {
            actionsWithoutResponsible,
            lateActionsWithoutResponsible,
            objectiveCount: objectives.length,
            objectivesWithActions,
            pendingMembersCount: pendingMembers.length,
        };
    }, [actions, activities, objectives, pendingMembers.length]);

    const handleCardClick = (status?: string) => {
        onNavigate("list", { status });
    };

    return (
        <div className="space-y-6 pb-8 animate-fade-in">
            {showPendingMembers ? (
                <DashboardPendingMembersAlert
                    onNavigateTeam={() => onNavigate("team")}
                    pendingMembers={pendingMembers}
                />
            ) : null}

            <DashboardHeader
                macroName={micro?.macrorregiao}
                microName={resolvedMicroName}
                onOpenReport={() => setIsReportModalOpen(true)}
                urs={micro?.urs}
                userName={user?.nome}
            />

            {/* 1. NARRATIVE - Slim Banner */}
            <DashboardExecutiveOverview
                insights={executiveInsights}
                isMobile={isMobile}
                macroName={micro?.macrorregiao}
                microName={resolvedMicroName}
                operations={executiveOperations}
                urs={micro?.urs}
            />

            {/* 2. KPI HERO - Slim and modern */}
            <DashboardKpiSection
                insights={executiveInsights}
                isMobile={isMobile}
                metrics={metrics}
                onCardClick={handleCardClick}
                onNavigateToList={() => onNavigate("list", {})}
                onNavigateToTeam={() => onNavigate("team")}
            />

            {/* 3. CENTRAL PANEL - Indicadores do plano (barras) e carga da equipe */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DashboardHealthRadar insights={executiveInsights} isMobile={isMobile} />
                <DashboardTeamCapacity data={metrics.actionsByMember} isMobile={isMobile} />
            </div>

            {/* 4. DETAIL - Timeline + Focus actions */}
            <DashboardSummaryPanels
                actions={actions}
                insights={executiveInsights}
                isMobile={isMobile}
                onActionClick={setSelectedActionId}
            />

            {/* 5. CHARTS - Legacy secondary visualizations */}
            <DashboardChartsSection
                isMobile={isMobile}
                metrics={metrics}
                onNavigateObjective={(objectiveId) => onNavigate("list", { objectiveId })}
                onStatusClick={handleCardClick}
            />

            <StrategicReportGenerator
                actions={actions}
                activities={activities}
                isOpen={isReportModalOpen}
                microName={resolvedMicroName}
                objectives={objectives}
                onClose={() => setIsReportModalOpen(false)}
                team={team}
                userName={user?.nome || "Gestor"}
            />

            {selectedActionId && selectedAction && (
                <ActionDetailModal
                    action={selectedAction}
                    isOpen={true}
                    onClose={() => setSelectedActionId(null)}
                    onDeleteAction={() => {}}
                    readOnly={true}
                    team={team}
                />
            )}
        </div>
    );
};
