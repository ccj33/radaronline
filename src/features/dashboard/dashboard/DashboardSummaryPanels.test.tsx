import { fireEvent, render, screen } from "@testing-library/react";
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

        expect(screen.getByText("Proximos prazos (7 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 4 dias")).toBeInTheDocument();
        expect(screen.queryByText("Entrega em 13 dias")).not.toBeInTheDocument();
        expect(screen.queryByText("Entrega em 26 dias")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "15d" }));

        expect(screen.getByText("Proximos prazos (15 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 4 dias")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 13 dias")).toBeInTheDocument();
        expect(screen.queryByText("Entrega em 26 dias")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "30d" }));

        expect(screen.getByText("Proximos prazos (30 dias)")).toBeInTheDocument();
        expect(screen.getByText("Entrega em 26 dias")).toBeInTheDocument();
        expect(screen.getByText("25/04/2026")).toBeInTheDocument();
    });
});
