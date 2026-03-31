import React, { useMemo, useState } from "react";

import { useAuth } from "../../auth";
import { StrategicReportGenerator } from "../../components/reports/StrategicReportGenerator";
import { getMicroregiaoById } from "../../data/microregioes";
import { useResponsive } from "../../hooks/useMediaQuery";
import { filterActionsByObjective, getDerivedActionStatus } from "../../lib/actionPortfolio";
import { buildMicroDetailInsights } from "../../lib/microInsights";
import { DashboardChartsSection } from "./dashboard/DashboardChartsSection";
import { DashboardExecutiveOverview } from "./dashboard/DashboardExecutiveOverview";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardKpiSection } from "./dashboard/DashboardKpiSection";
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
    const resolvedMicroId = currentMicroId && currentMicroId !== "all"
        ? currentMicroId
        : user?.microregiaoId && user.microregiaoId !== "all"
            ? user.microregiaoId
            : actions[0]?.microregiaoId || team[0]?.microregiaoId || null;
    const micro = useMemo(
        () => (resolvedMicroId ? getMicroregiaoById(resolvedMicroId) || null : null),
        [resolvedMicroId],
    );
    const resolvedMicroName = currentMicroLabel || micro?.nome || "Microrregiao";
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
    const showEmptyState = (executiveInsights?.totalActions || 0) === 0;

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

            <DashboardExecutiveOverview
                insights={executiveInsights}
                isMobile={isMobile}
                macroName={micro?.macrorregiao}
                microName={resolvedMicroName}
                operations={executiveOperations}
                urs={micro?.urs}
            />

            <DashboardKpiSection
                isMobile={isMobile}
                metrics={metrics}
                onCardClick={handleCardClick}
                onNavigateToList={() => onNavigate("list", {})}
                onNavigateToTeam={() => onNavigate("team")}
                setup={showEmptyState ? {
                    activeUsers: executiveInsights?.activeUsers || 0,
                    objectiveCount: objectives.length,
                    pendingMembersCount: pendingMembers.length,
                    totalUsers: executiveInsights?.totalUsers || 0,
                } : null}
            />

            {showEmptyState ? null : (
                <>
                    <DashboardChartsSection
                        isMobile={isMobile}
                        metrics={metrics}
                        onNavigateObjective={(objectiveId) => onNavigate("list", { objectiveId })}
                        onStatusClick={handleCardClick}
                    />

                    <DashboardSummaryPanels
                        actions={actions}
                        insights={executiveInsights}
                        isMobile={isMobile}
                    />
                </>
            )}

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
        </div>
    );
};
