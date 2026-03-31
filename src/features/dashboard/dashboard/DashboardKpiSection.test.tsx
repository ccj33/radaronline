import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardKpiSection } from "./DashboardKpiSection";
import type { DashboardMetrics } from "./dashboard.types";

const baseMetrics: DashboardMetrics = {
    actionsByMember: [],
    atrasados: 4,
    concluidos: 12,
    emAndamento: 18,
    naoIniciados: 9,
    percentConcluido: 28,
    progressoPorObjetivo: [],
    statusData: [],
    total: 43,
    upcomingDeadlines: [],
};

describe("DashboardKpiSection", () => {
    it("renderiza a leitura minimalista com dica de interacao e calculos", () => {
        render(
            <DashboardKpiSection
                isMobile={false}
                metrics={baseMetrics}
                onCardClick={vi.fn()}
                onNavigateToList={vi.fn()}
                onNavigateToTeam={vi.fn()}
            />,
        );

        expect(screen.queryByText("Resumo da carteira")).not.toBeInTheDocument();
        expect(screen.queryByText(/Clique em um indicador para abrir o recorte correspondente/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Calculo/i)).not.toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
        expect(screen.getByText("Total de acoes")).toBeInTheDocument();
        expect(screen.getByText("Em execucao")).toBeInTheDocument();
        expect(screen.getByText("Concluidas")).toBeInTheDocument();
        expect(screen.getByText("Atencao necessaria")).toBeInTheDocument();

        const ritmoTitle = screen.getByText("Em execucao");
        const entregaTitle = screen.getByText("Concluidas");

        expect(ritmoTitle.compareDocumentPosition(entregaTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("troca para o estado de setup com explicacoes operacionais mais enxutas", () => {
        render(
            <DashboardKpiSection
                isMobile={false}
                metrics={{ ...baseMetrics, total: 0 }}
                onCardClick={vi.fn()}
                onNavigateToList={vi.fn()}
                onNavigateToTeam={vi.fn()}
                setup={{
                    activeUsers: 3,
                    objectiveCount: 7,
                    pendingMembersCount: 2,
                    totalUsers: 5,
                }}
            />,
        );

        expect(screen.queryByText("Preparacao da carteira")).not.toBeInTheDocument();
        expect(screen.getByText("Objetivos ativos")).toBeInTheDocument();
        expect(screen.getByText("Equipe ativa")).toBeInTheDocument();
        expect(screen.getByText("Pendencias")).toBeInTheDocument();
        expect(screen.getByText("Proximo movimento")).toBeInTheDocument();
        expect(screen.queryByText(/usuarios ativos com acesso/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/use a carteira para cadastrar/i)).not.toBeInTheDocument();
    });
});
