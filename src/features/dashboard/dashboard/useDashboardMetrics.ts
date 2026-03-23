import { useMemo } from "react";

import { isAdminLike } from "../../../lib/authHelpers";
import {
    filterActionsByObjective,
    getDerivedActionStatus,
    getUpcomingActions,
    summarizeActionPortfolio,
} from "../../../lib/actionPortfolio";
import { DASHBOARD_COLORS } from "./dashboard.constants";
import type { DashboardMetrics, DashboardProps } from "./dashboard.types";

interface DashboardUserLike {
    role?: string | null;
}

interface UseDashboardMetricsParams {
    actions: DashboardProps["actions"];
    activities: DashboardProps["activities"];
    objectives: DashboardProps["objectives"];
    team: DashboardProps["team"];
    user: DashboardUserLike | null;
}

export function useDashboardMetrics({ actions, activities, objectives, team, user }: UseDashboardMetricsParams) {
    const pendingMembers = useMemo(() => {
        return team.filter((member) => member.isRegistered === false);
    }, [team]);

    const metrics = useMemo<DashboardMetrics>(() => {
        const summary = summarizeActionPortfolio(actions);

        const statusData = [
            { color: DASHBOARD_COLORS.concluido, name: "Concluído", value: summary.completed },
            { color: DASHBOARD_COLORS.emAndamento, name: "Em Andamento", value: summary.inProgress },
            { color: DASHBOARD_COLORS.naoIniciado, name: "Não Iniciado", value: summary.notStarted },
            { color: DASHBOARD_COLORS.atrasado, name: "Atrasado", value: summary.late },
        ].filter((item) => item.value > 0);

        const progressoPorObjetivo = objectives.map((objective, index) => {
            const objectiveActions = filterActionsByObjective(actions, activities, objective.id);
            const progress = objectiveActions.length > 0
                ? Math.round(objectiveActions.reduce((sum, action) => sum + action.progress, 0) / objectiveActions.length)
                : 0;

            return {
                count: objectiveActions.length,
                fullName: objective.title,
                id: objective.id,
                name: `Obj ${index + 1}`,
                progress,
            };
        });

        const upcomingDeadlines = getUpcomingActions(actions);

        const actionsByMember = team
            .map((member) => {
                const count = actions.filter((action) => {
                    return action.raci.some((entry: { name: string; role: string }) => entry.name === member.name && entry.role === "R")
                        && getDerivedActionStatus(action) !== "Concluído";
                }).length;

                return {
                    count,
                    fullName: member.name,
                    name: member.name.split(" ")[0],
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            actionsByMember,
            atrasados: summary.late,
            concluidos: summary.completed,
            emAndamento: summary.inProgress,
            naoIniciados: summary.notStarted,
            percentConcluido: summary.percentConcluido,
            progressoPorObjetivo,
            statusData,
            total: summary.total,
            upcomingDeadlines,
        };
    }, [actions, activities, objectives, team]);

    const showPendingMembers = pendingMembers.length > 0 && (isAdminLike(user?.role ?? undefined) || user?.role === "gestor");

    return {
        metrics,
        pendingMembers,
        showPendingMembers,
    };
}
