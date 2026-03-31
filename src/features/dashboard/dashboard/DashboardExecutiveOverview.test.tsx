import { act, fireEvent, render, screen } from "@testing-library/react";
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
            title: "Carteira ainda nao iniciada",
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
        title: "Montar a primeira carteira",
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
        vi.useRealTimers();
    });

    it("troca placeholders genericos por informacoes de gestao", () => {
        render(
            <DashboardExecutiveOverview
                insights={baseInsights}
                isMobile={false}
                microName="Micro Teste"
                operations={baseOperations}
            />,
        );

        expect(screen.getByText("Ritmo recente")).toBeInTheDocument();
        expect(screen.getByText("0 concluidas em 30d")).toBeInTheDocument();
        expect(screen.getByText("Cobertura dos objetivos")).toBeInTheDocument();
        expect(screen.getByText("0/7")).toBeInTheDocument();
        expect(screen.getByText("7 objetivos ainda sem acao registrada.")).toBeInTheDocument();
        expect(screen.getByText("Governanca da execucao")).toBeInTheDocument();
        expect(screen.getByText("3/5")).toBeInTheDocument();
        expect(screen.getByText("2 cadastros pendentes")).toBeInTheDocument();
        expect(screen.queryByText("Base local")).not.toBeInTheDocument();
        expect(screen.queryByText("Ainda nao existe historico suficiente para destacar uma referencia operacional da micro.")).not.toBeInTheDocument();
    });

    it("explica no hover como o score operacional e calculado", () => {
        vi.useFakeTimers();

        render(
            <DashboardExecutiveOverview
                insights={{
                    ...baseInsights,
                    averageProgress: 60,
                    completionRate: 40,
                    healthScore: {
                        label: "Em atencao",
                        score: 58,
                        summary: "Execucao exigindo acompanhamento.",
                        tone: "critical",
                    },
                    responsibleCoverage: 80,
                    statusBreakdown: {
                        completed: 8,
                        inProgress: 10,
                        late: 2,
                        notStarted: 0,
                    },
                    totalActions: 20,
                }}
                isMobile={false}
                microName="Micro Teste"
                operations={baseOperations}
            />,
        );

        const scoreTriggers = screen.getAllByLabelText("Como o score operacional e calculado");
        const scoreTrigger = scoreTriggers[scoreTriggers.length - 1];

        expect(scoreTrigger).toBeTruthy();
        fireEvent.mouseEnter(scoreTrigger!);

        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(screen.getByRole("tooltip")).toHaveTextContent("Como calculamos");
        expect(screen.getByRole("tooltip")).toHaveTextContent("Conclusao: 40% x 45%");
        expect(screen.getByRole("tooltip")).toHaveTextContent("Prazo sem atraso: 90% x 25%");
        expect(screen.getByRole("tooltip")).toHaveTextContent("Nota final:");
    });
});
