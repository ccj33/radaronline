import { describe, expect, it } from "vitest";

import { buildMicroDetailInsights } from "../../../lib/microInsights";
import type { Action } from "../../../types";
import type { User } from "../../../types/auth.types";

function makeAction(overrides: Partial<Action>): Action {
  return {
    uid: "MR011::1.1.1",
    id: "1.1.1",
    activityId: "1.1",
    microregiaoId: "MR011",
    title: "Acao de teste",
    status: "N\u00e3o Iniciado",
    startDate: "",
    plannedEndDate: "",
    endDate: "",
    progress: 0,
    raci: [],
    tags: [],
    notes: "",
    comments: [],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User>): User {
  return {
    id: "user-1",
    nome: "Usuario Teste",
    email: "teste@radar.local",
    role: "gestor",
    microregiaoId: "MR011",
    microregiaoIds: ["MR011"],
    ativo: true,
    lgpdConsentimento: true,
    avatarId: "avatar-1",
    firstAccess: false,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildMicroDetailInsights", () => {
  it("gera leitura gerencial com score, alertas, benchmark e recomendacao", () => {
    const today = new Date("2026-03-30T00:00:00");
    const actions: Action[] = [
      makeAction({
        uid: "MR011::1.1.1",
        title: "Implantar teleconsultoria",
        progress: 100,
        status: "Conclu\u00eddo",
        endDate: "2026-03-20",
        plannedEndDate: "2026-03-25",
        raci: [{ name: "Alice", role: "R" }],
      }),
      makeAction({
        uid: "MR011::1.1.2",
        id: "1.1.2",
        title: "Treinar equipe APS",
        plannedEndDate: "2026-03-10",
        progress: 25,
        status: "Em Andamento",
      }),
      makeAction({
        uid: "MR011::1.1.3",
        id: "1.1.3",
        title: "Validar fluxo de regulacao",
        plannedEndDate: "2026-04-02",
        progress: 60,
        status: "Em Andamento",
        raci: [{ name: "Bruno", role: "R" }],
      }),
      makeAction({
        uid: "MR011::1.1.4",
        id: "1.1.4",
        title: "Atualizar protocolo regional",
        plannedEndDate: "2026-04-20",
        progress: 10,
        status: "Em Andamento",
        raci: [{ name: "Alice", role: "R" }],
      }),
      makeAction({
        uid: "MR012::1.1.1",
        microregiaoId: "MR012",
        title: "Acao macro benchmark 1",
        progress: 100,
        status: "Conclu\u00eddo",
        endDate: "2026-03-18",
        plannedEndDate: "2026-03-22",
        raci: [{ name: "Clara", role: "R" }],
      }),
      makeAction({
        uid: "MR012::1.1.2",
        id: "1.1.2",
        microregiaoId: "MR012",
        title: "Acao macro benchmark 2",
        progress: 95,
        status: "Conclu\u00eddo",
        endDate: "2026-03-12",
        plannedEndDate: "2026-03-15",
        raci: [{ name: "Clara", role: "R" }],
      }),
      makeAction({
        uid: "MR012::1.1.3",
        id: "1.1.3",
        microregiaoId: "MR012",
        title: "Acao macro benchmark 3",
        progress: 80,
        status: "Em Andamento",
        plannedEndDate: "2026-04-10",
        raci: [{ name: "Davi", role: "R" }],
      }),
    ];
    const users: User[] = [
      makeUser({ id: "alice", nome: "Alice" }),
      makeUser({ id: "bruno", nome: "Bruno" }),
    ];

    const insights = buildMicroDetailInsights("MR011", actions, users, today);

    expect(insights.totalActions).toBe(4);
    expect(insights.totalUsers).toBe(2);
    expect(insights.responsibleCoverage).toBe(75);
    expect(insights.healthScore.tone).toBe("critical");
    expect(insights.trend.direction).toBe("up");
    expect(insights.benchmark?.direction).toBe("below");
    expect(insights.upcomingActions).toHaveLength(1);
    expect(insights.upcomingActions[0]?.title).toBe("Validar fluxo de regulacao");
    expect(insights.alerts.some((alert) => alert.id === "late-actions")).toBe(true);
    expect(insights.alerts.some((alert) => alert.id === "upcoming-actions")).toBe(true);
    expect(insights.topPerformer?.name).toBe("Alice");
    expect(insights.recommendation.tone).toBe("critical");
    expect(insights.focusActions[0]?.title).toBe("Treinar equipe APS");
  });

  it("sinaliza micro sem carteira como falta de tracao", () => {
    const insights = buildMicroDetailInsights("MR011", [], [], new Date("2026-03-30T00:00:00"));

    expect(insights.healthScore.score).toBe(0);
    expect(insights.healthScore.tone).toBe("neutral");
    expect(insights.alerts[0]?.id).toBe("no-actions");
    expect(insights.recommendation.title).toBe("Montar a primeira carteira");
    expect(insights.upcomingActions).toHaveLength(0);
    expect(insights.topPerformer).toBeNull();
  });

  it("omite benchmark quando a visualizacao so tem a micro atual", () => {
    const insights = buildMicroDetailInsights(
      "MR011",
      [
        makeAction({
          plannedEndDate: "2026-04-02",
          progress: 40,
          raci: [{ name: "Alice", role: "R" }],
          status: "Em Andamento",
        }),
      ],
      [makeUser({ id: "alice", nome: "Alice" })],
      new Date("2026-03-30T00:00:00"),
    );

    expect(insights.benchmark).toBeNull();
  });
});
