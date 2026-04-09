import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MicroDetailInsights } from "../../../lib/microInsights";
import {
    DashboardExecutiveOverview,
    type DashboardExecutiveOperations,
} from "./DashboardExecutiveOverview";

const baseInsights: MicroDetailInsights = {
    activeUsers: 3,
    alerts: [
        {
            description: "Cadastre as primeiras acoes da micro para liberar acompanhamento, score e alertas operacionais.",
            id: "no-actions",
            title: "Plano de acao ainda nao iniciado",
            tone: "warning",
        },
    ],
    averageProgress: 0,
    benchmark: null,
    completionRate: 0,
    focusActions: [],
    healthScore: {
        label: "Sem tracao",
        score: 0,
        summary: "Ainda nao ha acoes suficientes para medir a saude operacional desta micro.",
        tone: "neutral",
    },
    recommendation: {
        description: "Escolha os objetivos prioritarios da micro, cadastre as primeiras acoes e defina responsaveis.",
        title: "Montar o primeiro plano de acao",
        tone: "warning",
    },
    responsibleCoverage: 0,
    statusBreakdown: {
        completed: 0,
        inProgress: 0,
        late: 0,
        notStarted: 0,
    },
    topPerformer: null,
    totalActions: 0,
    totalUsers: 5,
    trend: {
        currentPeriodCompleted: 0,
        direction: "stable",
        label: "Sem entregas recentes",
        previousPeriodCompleted: 0,
        summary: "Nenhuma acao foi concluida nos ultimos 60 dias.",
    },
    upcomingActions: [],
};

const baseOperations: DashboardExecutiveOperations = {
    actionsWithoutResponsible: 0,
    lateActionsWithoutResponsible: 0,
    objectiveCount: 7,
    objectivesWithActions: 0,
    pendingMembersCount: 2,
};

describe("DashboardExecutiveOverview", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("exibe score, narrativa e recomendacao em layout hierarquico", () => {
        render(
            <DashboardExecutiveOverview
                insights={baseInsights}
                isMobile={false}
                microName="Micro Teste"
                operations={baseOperations}
            />,
        );

        expect(screen.queryByText("Micro Teste")).not.toBeInTheDocument(); // Name is no longer in this specific component
        expect(screen.getByText("Montar o primeiro plano de acao")).toBeInTheDocument();
        expect(screen.getByText("Escolha os objetivos prioritarios da micro, cadastre as primeiras acoes e defina responsaveis.")).toBeInTheDocument();
    });

    it("nao renderiza nada se a recomendacao for positiva ou neutra", () => {
        const { container } = render(
            <DashboardExecutiveOverview
                insights={{
                    ...baseInsights,
                    recommendation: {
                        description: "Tudo indo bem.",
                        title: "Bom trabalho",
                        tone: "positive",
                    },
                }}
                isMobile={false}
                microName="Micro Teste"
                operations={baseOperations}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
