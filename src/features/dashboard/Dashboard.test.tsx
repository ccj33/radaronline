import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildMicroDetailInsights } from "../../lib/microInsights";
import type { Action } from "../../types";
import { Dashboard } from "./Dashboard";

vi.mock("../../auth", () => ({
    useAuth: () => ({
        user: {
            id: "user-1",
            microregiaoId: "MR001",
            nome: "Gestora teste",
        },
    }),
}));

vi.mock("../../hooks/useMediaQuery", () => ({
    useResponsive: () => ({ isMobile: false }),
}));

vi.mock("../../components/reports/StrategicReportGenerator", () => ({
    StrategicReportGenerator: () => null,
}));

vi.mock("../../lib/microInsights", () => ({
    buildMicroDetailInsights: vi.fn(() => ({ activeUsers: 0, totalActions: 1, totalUsers: 0 })),
}));

vi.mock("./dashboard/useDashboardMetrics", () => ({
    useDashboardMetrics: () => ({
        metrics: {
            actionsByMember: [],
            atrasados: 0,
            concluidos: 0,
            emAndamento: 1,
            naoIniciados: 0,
            percentConcluido: 0,
            progressoPorObjetivo: [],
            statusData: [],
            total: 1,
            upcomingDeadlines: [],
        },
        pendingMembers: [],
        showPendingMembers: false,
    }),
}));

vi.mock("./dashboard/DashboardPendingMembersAlert", () => ({
    DashboardPendingMembersAlert: () => null,
}));

vi.mock("./dashboard/DashboardHeader", () => ({
    DashboardHeader: ({ microName }: { microName?: string | null }) => <div>header:{microName}</div>,
}));

vi.mock("./dashboard/DashboardExecutiveOverview", () => ({
    DashboardExecutiveOverview: ({ microName }: { microName: string }) => <div>overview:{microName}</div>,
}));

vi.mock("./dashboard/DashboardKpiSection", () => ({
    DashboardKpiSection: () => null,
}));

vi.mock("./dashboard/DashboardChartsSection", () => ({
    DashboardChartsSection: () => null,
}));

vi.mock("./dashboard/DashboardSummaryPanels", () => ({
    DashboardSummaryPanels: () => null,
}));

const sampleAction: Action = {
    uid: "MR016::1.1.1",
    id: "1.1.1",
    activityId: "1.1",
    microregiaoId: "MR016",
    title: "Acao teste",
    status: "Em Andamento",
    startDate: "2026-03-01",
    plannedEndDate: "2026-04-01",
    endDate: "",
    progress: 20,
    raci: [],
    tags: [],
    notes: "",
    comments: [],
};

describe("Dashboard", () => {
    it("usa a microrregiao atualmente analisada para nome e calculo dos indicadores", () => {
        render(
            <Dashboard
                actions={[sampleAction]}
                activities={{}}
                currentMicroId="MR016"
                currentMicroLabel="Belo Horizonte/Nova Lima/Santa Luzia"
                objectives={[]}
                onNavigate={vi.fn()}
                team={[]}
            />,
        );

        expect(screen.getByText("header:Belo Horizonte/Nova Lima/Santa Luzia")).toBeInTheDocument();
        expect(screen.getByText("overview:Belo Horizonte/Nova Lima/Santa Luzia")).toBeInTheDocument();
        expect(buildMicroDetailInsights).toHaveBeenCalledWith(
            "MR016",
            [sampleAction],
            [],
        );
    });
});
