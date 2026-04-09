import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Action } from "../../../types";
import { DashboardSummaryPanels } from "./DashboardSummaryPanels";

function buildAction(overrides: Partial<Action>): Action {
    return {
        uid: overrides.uid || "MR016::1.1.1",
        id: overrides.id || "1.1.1",
        activityId: overrides.activityId || "1.1",
        microregiaoId: overrides.microregiaoId || "MR016",
        title: overrides.title || "Acao teste",
        status: overrides.status || "Em Andamento",
        startDate: overrides.startDate || "2026-03-20",
        plannedEndDate: overrides.plannedEndDate || "",
        endDate: overrides.endDate || "",
        progress: overrides.progress ?? 20,
        raci: overrides.raci || [],
        tags: overrides.tags || [],
        notes: overrides.notes || "",
        comments: overrides.comments || [],
    };
}

describe("DashboardSummaryPanels", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("alterna a janela de prazo entre 7, 15 e 30 dias", () => {
        render(
            <DashboardSummaryPanels
                actions={[
                    buildAction({
                        id: "1.1.3",
                        title: "Entrega em 4 dias",
                        uid: "MR016::1.1.3",
                        plannedEndDate: "2026-04-03",
                    }),
                    buildAction({
                        id: "2.1.2",
                        title: "Entrega em 13 dias",
                        uid: "MR016::2.1.2",
                        plannedEndDate: "2026-04-12",
                    }),
                    buildAction({
                        id: "3.1.1",
                        title: "Entrega em 26 dias",
                        uid: "MR016::3.1.1",
                        plannedEndDate: "2026-04-25",
                    }),
                ]}
                insights={null}
                isMobile={false}
            />,
        );

        expect(screen.getByText("Proximos prazos (30 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 4 dias")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 13 dias")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 26 dias")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Proximos prazos 7 dias" }));

        expect(screen.getByText("Proximos prazos (7 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 4 dias")).toBeInTheDocument();
        expect(screen.queryByText("Entrega em 13 dias")).not.toBeInTheDocument();
        expect(screen.queryByText("Entrega em 26 dias")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Proximos prazos 15 dias" }));

        expect(screen.getByText("Proximos prazos (15 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 4 dias")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 13 dias")).toBeInTheDocument();
        expect(screen.queryByText("Entrega em 26 dias")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Proximos prazos 30 dias" }));

        expect(screen.getByText("Proximos prazos (30 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 26 dias")).toBeInTheDocument();
        expect(screen.getByText("25/04/2026")).toBeInTheDocument();
    });

    it("alterna a janela de casos atrasados entre 7, 15 e 30 dias", () => {
        render(
            <DashboardSummaryPanels
                actions={[
                    buildAction({
                        id: "1.1.1",
                        title: "Atraso leve",
                        uid: "MR016::1.1.1",
                        plannedEndDate: "2026-03-29",
                        progress: 0,
                    }),
                    buildAction({
                        id: "1.1.2",
                        title: "Atraso medio",
                        uid: "MR016::1.1.2",
                        plannedEndDate: "2026-03-20",
                        progress: 0,
                    }),
                    buildAction({
                        id: "1.1.3",
                        title: "Atraso longo",
                        uid: "MR016::1.1.3",
                        plannedEndDate: "2026-03-05",
                        progress: 0,
                    }),
                ]}
                insights={null}
                isMobile={false}
            />,
        );

        expect(screen.getByText("Casos atrasados (30 dias)")).toBeInTheDocument();
        expect(screen.getByText("Atraso leve")).toBeInTheDocument();
        expect(screen.getByText("Atraso medio")).toBeInTheDocument();
        expect(screen.getByText("Atraso longo")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Casos atrasados 7 dias" }));

        expect(screen.getByText("Casos atrasados (7 dias)")).toBeInTheDocument();
        expect(screen.getByText("Atraso leve")).toBeInTheDocument();
        expect(screen.queryByText("Atraso medio")).not.toBeInTheDocument();
        expect(screen.queryByText("Atraso longo")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Casos atrasados 15 dias" }));

        expect(screen.getByText("Casos atrasados (15 dias)")).toBeInTheDocument();
        expect(screen.getByText("Atraso leve")).toBeInTheDocument();
        expect(screen.getByText("Atraso medio")).toBeInTheDocument();
        expect(screen.queryByText("Atraso longo")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Casos atrasados 30 dias" }));

        expect(screen.getByText("Atraso longo")).toBeInTheDocument();
    });
});
