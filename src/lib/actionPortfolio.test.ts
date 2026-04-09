import { describe, expect, it, vi } from "vitest";

import type { Action, Activity } from "../types";
import {
  filterActionsByObjective,
  getDelayedActions,
  getDerivedActionStatus,
  summarizeActionPortfolio,
} from "./actionPortfolio";
import { findObjectiveIdByActivityId } from "./text";

function buildAction(overrides: Partial<Action> = {}): Action {
  return {
    uid: "MR070::1.1.1",
    id: "1.1.1",
    activityId: "1.1",
    microregiaoId: "MR070",
    title: "Acao de teste",
    status: "Em Andamento",
    startDate: "2026-03-01",
    plannedEndDate: "2026-03-20",
    endDate: "",
    progress: 50,
    raci: [],
    tags: [],
    notes: "",
    comments: [],
    ...overrides,
  };
}

describe("actionPortfolio", () => {
  it("derives late status even when the persisted status was not updated", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00.000Z"));

    const action = buildAction({
      status: "Em Andamento",
      plannedEndDate: "2026-03-10",
      progress: 40,
    });

    expect(getDerivedActionStatus(action, new Date())).toBe("Atrasado");

    vi.useRealTimers();
  });

  it("matches actions to objectives across legacy and normalized activity ids", () => {
    const actions = [
      buildAction({ activityId: "1.1" }),
      buildAction({ uid: "MR070::2.1.1", id: "2.1.1", activityId: "2.1" }),
    ];

    const activitiesByObjective: Record<number, Activity[]> = {
      1: [{ id: "MR070_1.1", title: "Atividade 1", description: "" }],
      2: [{ id: "MR070_2.1_abcd1234", title: "Atividade 2", description: "" }],
    };

    expect(filterActionsByObjective(actions, activitiesByObjective, 1)).toHaveLength(1);
    expect(filterActionsByObjective(actions, activitiesByObjective, 2)).toHaveLength(1);
    expect(findObjectiveIdByActivityId("1.1", activitiesByObjective)).toBe(1);
    expect(findObjectiveIdByActivityId("MR070_2.1", activitiesByObjective)).toBe(2);
  });

  it("summarizes the portfolio with derived statuses instead of trusting raw status only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00.000Z"));

    const summary = summarizeActionPortfolio([
      buildAction({ status: "Não Iniciado", progress: 0, startDate: "", plannedEndDate: "2026-03-30" }),
      buildAction({ uid: "MR070::1.1.2", id: "1.1.2", plannedEndDate: "2026-03-10", progress: 35 }),
      buildAction({ uid: "MR070::1.1.3", id: "1.1.3", status: "Em Andamento", progress: 70, plannedEndDate: "2026-03-28" }),
      buildAction({ uid: "MR070::1.1.4", id: "1.1.4", status: "Em Andamento", progress: 100, endDate: "2026-03-22" }),
    ], new Date());

    expect(summary).toEqual({
      total: 4,
      completed: 1,
      inProgress: 1,
      notStarted: 1,
      late: 1,
      percentConcluido: 25,
    });

    vi.useRealTimers();
  });

  it("lista atrasos por janela de dias desde o prazo planejado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));

    const today = new Date();
    const actions = [
      buildAction({
        uid: "MR070::1.1.1",
        id: "1.1.1",
        plannedEndDate: "2026-03-29",
        progress: 10,
      }),
      buildAction({
        uid: "MR070::1.1.2",
        id: "1.1.2",
        plannedEndDate: "2026-03-20",
        progress: 5,
      }),
      buildAction({
        uid: "MR070::1.1.3",
        id: "1.1.3",
        plannedEndDate: "2026-03-05",
        progress: 0,
      }),
    ];

    expect(getDelayedActions(actions, today, 7, 10)).toHaveLength(1);
    expect(getDelayedActions(actions, today, 7, 10)[0]?.id).toBe("1.1.1");

    const w15 = getDelayedActions(actions, today, 15, 10);
    expect(w15).toHaveLength(2);
    expect(w15.map((a) => a.id)).toEqual(["1.1.2", "1.1.1"]);

    const w30 = getDelayedActions(actions, today, 30, 10);
    expect(w30).toHaveLength(3);
    expect(w30.map((a) => a.id)).toEqual(["1.1.3", "1.1.2", "1.1.1"]);

    vi.useRealTimers();
  });
});
