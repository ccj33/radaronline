import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    afterEach(cleanup);

    it("renderiza os 4 KPIs com valores corretos", () => {
        render(
            <DashboardKpiSection
                isMobile={false}
                metrics={baseMetrics}
                onCardClick={vi.fn()}
                onNavigateToList={vi.fn()}
                onNavigateToTeam={vi.fn()}
            />,
        );

        expect(screen.getByText("Total de Acoes")).toBeInTheDocument();
        expect(screen.getByText("Em Execucao")).toBeInTheDocument();
        expect(screen.getByText("Cadencia 30d")).toBeInTheDocument();
        expect(screen.getByText("Atrasadas")).toBeInTheDocument();
        expect(screen.getByText("43")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("0")).toBeInTheDocument(); // Cadencia sem dados no mock base
        expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("mostra trend badges e subtitulos contextuais", () => {
        render(
            <DashboardKpiSection
                isMobile={false}
                metrics={baseMetrics}
                onCardClick={vi.fn()}
                onNavigateToList={vi.fn()}
                onNavigateToTeam={vi.fn()}
            />,
        );

        expect(screen.getAllByText(/28% concluido/).length).toBeGreaterThanOrEqual(1);
    });

    it("destaca visualmente quando ha atrasos", () => {
        render(
            <DashboardKpiSection
                isMobile={false}
                metrics={{ ...baseMetrics, atrasados: 10 }}
                onCardClick={vi.fn()}
                onNavigateToList={vi.fn()}
                onNavigateToTeam={vi.fn()}
            />,
        );

        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getAllByText(/23% do planejamento/).length).toBeGreaterThanOrEqual(1);
    });
});
