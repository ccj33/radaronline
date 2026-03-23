import type { Action, Activity, Objective, TeamMember } from "../../../types";
import {
    filterActionsByObjective,
    getDerivedActionStatus,
    getUpcomingActions,
    summarizeActionPortfolio,
} from "../../../lib/actionPortfolio";
import type { StrategicReportMetrics } from "./strategicReport.types";

export function calculateStrategicReportMetrics(
    actions: Action[],
    objectives: Objective[],
    activities: Record<number, Activity[]>,
    team: TeamMember[],
): StrategicReportMetrics {
    const summary = summarizeActionPortfolio(actions);

    const statusData = [
        { color: "#10b981", name: "Concluído", value: summary.completed },
        { color: "#3b82f6", name: "Em Andamento", value: summary.inProgress },
        { color: "#94a3b8", name: "Não Iniciado", value: summary.notStarted },
        { color: "#f43f5e", name: "Atrasado", value: summary.late },
    ].filter((datum) => datum.value > 0);

    const progressoPorObjetivo = objectives.map((objective) => {
        const objectiveActions = filterActionsByObjective(actions, activities, objective.id);
        const completed = objectiveActions.filter((action) => getDerivedActionStatus(action) === "Concluído").length;
        const progress = objectiveActions.length > 0
            ? Math.round(objectiveActions.reduce((sum, action) => sum + action.progress, 0) / objectiveActions.length)
            : 0;

        return {
            completed,
            count: objectiveActions.length,
            fullName: objective.title,
            id: objective.id,
            name: `Obj ${objective.id}`,
            progress,
        };
    });

    const upcomingDeadlines = getUpcomingActions(actions);

    const actionsByMember = team
        .map((member) => {
            const count = actions.filter((action) => {
                return action.raci.some((entry) => entry.name === member.name && entry.role === "R")
                    && getDerivedActionStatus(action) !== "Concluído";
            }).length;

            return {
                count,
                fullName: member.name,
                name: member.name.split(" ")[0],
            };
        })
        .sort((memberA, memberB) => memberB.count - memberA.count)
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
}
