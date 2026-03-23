import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Action, TeamMember } from "../../../types";
import type { User } from "../../../types/auth.types";
import { MICROREGIOES, MACRORREGIOES, getMicroregiaoById, getMicroregioesByMacro } from "../../../data/microregioes";
import {
  extractObjectiveSequenceFromActivityId,
  getDerivedActionStatus,
  isActionLate,
  summarizeActionPortfolio,
} from "../../../lib/actionPortfolio";
import { getActionDisplayId } from "../../../lib/text";
import type { DashboardFiltersState } from "./DashboardFilters";
import { KpiDetailModal } from "./KpiDetailModal";
import { AdminOverviewChartsSection } from "./adminOverview/AdminOverviewChartsSection";
import { AdminOverviewKpiSection } from "./adminOverview/AdminOverviewKpiSection";
import { ReprogrammedActionsModal } from "./adminOverview/ReprogrammedActionsModal";
import type { AdminOverviewDetailedData, AdminOverviewMetrics } from "./adminOverview/adminOverview.types";
import type { ActionSummary, DeadlineItem, StatusItem } from "./kpiDetailModal/kpiDetailModal.types";

interface AdminOverviewProps {
  actions: Action[];
  users: User[];
  teams: Record<string, TeamMember[]>;
  filters?: DashboardFiltersState;
  children?: ReactNode;
  onTabChange?: (tab: "usuarios" | "ranking") => void;
  pendingCount?: number;
  onViewMicro?: (id: string) => void;
}

type OverviewModalKey = "conclusao" | "risco" | "cobertura" | "horizonte" | "status" | "reprogramadas" | null;

type DeadlineBucketKey = "Atrasadas" | "Hoje" | "7 Dias" | "30 Dias" | "Futuro";

const DEADLINE_BUCKETS: Array<{ color: string; key: DeadlineBucketKey }> = [
  { key: "Atrasadas", color: "#f43f5e" },
  { key: "Hoje", color: "#f59e0b" },
  { key: "7 Dias", color: "#3b82f6" },
  { key: "30 Dias", color: "#64748b" },
  { key: "Futuro", color: "#94a3b8" },
];

const STATUS_BUCKETS: Array<{ color: string; name: string; status: Action["status"] }> = [
  { name: "Concluídas", status: "Concluído", color: "#10b981" },
  { name: "Em Andamento", status: "Em Andamento", color: "#3b82f6" },
  { name: "Não Iniciadas", status: "Não Iniciado", color: "#94a3b8" },
  { name: "Atrasadas", status: "Atrasado", color: "#f43f5e" },
];

function toStartOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function getResponsibleName(action: Action): string {
  return action.raci?.find((person) => person.role === "R")?.name || "";
}

function getDeadlineBucket(action: Action, today: Date): DeadlineBucketKey | null {
  if (getDerivedActionStatus(action, today) === "Concluído") {
    return null;
  }

  const plannedDate = action.plannedEndDate ? new Date(`${action.plannedEndDate}T00:00:00`) : null;

  if (!plannedDate || Number.isNaN(plannedDate.getTime())) {
    return null;
  }

  if (isActionLate(action, today)) {
    return "Atrasadas";
  }

  const diffDays = (plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return "Hoje";
  if (diffDays <= 7) return "7 Dias";
  if (diffDays <= 30) return "30 Dias";
  return "Futuro";
}

function toActionSummary(action: Action): ActionSummary {
  return {
    uid: action.uid,
    id: getActionDisplayId(action.id),
    title: action.title,
    status: getDerivedActionStatus(action),
    plannedEndDate: action.plannedEndDate,
    responsible: getResponsibleName(action) || undefined,
    microName: getMicroregiaoById(action.microregiaoId)?.nome || action.microregiaoId,
  };
}

export function AdminOverview({
  actions,
  users,
  filters,
  children,
  onTabChange,
  pendingCount,
  onViewMicro,
}: AdminOverviewProps) {
  const filteredData = useMemo(() => {
    let filteredActions = actions;
    let filteredUsers = users;
    let coveredMicros = MICROREGIOES;

    if (filters?.selectedMacroId && filters.selectedMacroId !== "all") {
      const macro = MACRORREGIOES.find((item) => item.id === filters.selectedMacroId);
      if (macro) {
        coveredMicros = getMicroregioesByMacro(macro.nome);
        const microIds = new Set(coveredMicros.map((micro) => micro.id));
        filteredActions = filteredActions.filter((action) => microIds.has(action.microregiaoId));
        filteredUsers = filteredUsers.filter((user) => user.microregiaoId && microIds.has(user.microregiaoId));
      }
    }

    if (filters?.selectedMicroId && filters.selectedMicroId !== "all") {
      filteredActions = filteredActions.filter((action) => action.microregiaoId === filters.selectedMicroId);
      filteredUsers = filteredUsers.filter((user) => user.microregiaoId === filters.selectedMicroId);
      coveredMicros = coveredMicros.filter((micro) => micro.id === filters.selectedMicroId);
    }

    return {
      actions: filteredActions,
      users: filteredUsers,
      coveredMicros,
    };
  }, [actions, filters, users]);

  const metrics = useMemo<AdminOverviewMetrics>(() => {
    const { actions: filteredActions, users: filteredUsers, coveredMicros } = filteredData;
    const summary = summarizeActionPortfolio(filteredActions);
    const totalMicros = Math.max(coveredMicros.length, 1);
    const microsComAcoes = new Set(filteredActions.map((action) => action.microregiaoId)).size;
    const taxaCobertura = Math.round((microsComAcoes / totalMicros) * 100);

    const hoje = toStartOfDay(new Date());
    const deadlineCounts = DEADLINE_BUCKETS.reduce<Record<DeadlineBucketKey, number>>((acc, bucket) => {
      acc[bucket.key] = 0;
      return acc;
    }, {
      Atrasadas: 0,
      Hoje: 0,
      "7 Dias": 0,
      "30 Dias": 0,
      Futuro: 0,
    });

    filteredActions.forEach((action) => {
      const bucket = getDeadlineBucket(action, hoje);
      if (bucket) {
        deadlineCounts[bucket] += 1;
      }
    });

    const concluidasComAtraso = filteredActions.filter((action) => {
      if (getDerivedActionStatus(action, hoje) !== "Concluído") return false;
      if (!action.endDate || !action.plannedEndDate) return false;
      return new Date(action.endDate) > new Date(action.plannedEndDate);
    }).length;

    const concluidasAntes = filteredActions.filter((action) => {
      if (getDerivedActionStatus(action, hoje) !== "Concluído") return false;
      if (!action.endDate || !action.plannedEndDate) return false;
      return new Date(action.endDate) < new Date(action.plannedEndDate);
    }).length;

    return {
      totalAcoes: summary.total,
      concluidas: summary.completed,
      andamento: summary.inProgress,
      naoIniciadas: summary.notStarted,
      atrasadas: summary.late,
      taxaConclusao: summary.percentConcluido,
      taxaCobertura,
      usuariosAtivos: filteredUsers.filter((user) => user.ativo).length,
      concluidasComAtraso,
      concluidasAntes,
      deadlineHorizon: DEADLINE_BUCKETS.map((bucket) => ({
        name: bucket.key,
        value: deadlineCounts[bucket.key],
        color: bucket.color,
      })),
    };
  }, [filteredData]);

  const statusData = useMemo(
    () => STATUS_BUCKETS.map((item) => ({
      name: item.name,
      value: filteredData.actions.filter((action) => getDerivedActionStatus(action) === item.status).length,
      color: item.color,
    })).filter((item) => item.value > 0),
    [filteredData.actions],
  );

  const [openModal, setOpenModal] = useState<OverviewModalKey>(null);

  const detailedData = useMemo<AdminOverviewDetailedData>(() => {
    const { actions: filteredActions, coveredMicros } = filteredData;
    const hoje = toStartOfDay(new Date());

    const actionCountByMicro = new Map<string, number>();
    filteredActions.forEach((action) => {
      actionCountByMicro.set(action.microregiaoId, (actionCountByMicro.get(action.microregiaoId) || 0) + 1);
    });

    const microCoverage = coveredMicros.map((micro) => ({
      id: micro.id,
      nome: micro.nome,
      macrorregiao: micro.macrorregiao,
      hasActions: actionCountByMicro.has(micro.id),
      actionCount: actionCountByMicro.get(micro.id) || 0,
    })).sort((a, b) => (a.hasActions !== b.hasActions ? (a.hasActions ? -1 : 1) : a.nome.localeCompare(b.nome)));

    const objectiveProgressMap = new Map<number, { completed: number; total: number }>();
    filteredActions.forEach((action) => {
      const objectiveSequence = extractObjectiveSequenceFromActivityId(action.activityId);
      if (!objectiveSequence) return;

      const current = objectiveProgressMap.get(objectiveSequence) || { completed: 0, total: 0 };
      current.total += 1;
      if (getDerivedActionStatus(action, hoje) === "Concluído") {
        current.completed += 1;
      }
      objectiveProgressMap.set(objectiveSequence, current);
    });

    const objectiveProgress = Array.from(objectiveProgressMap.entries())
      .sort(([left], [right]) => left - right)
      .map(([objectiveSequence, data]) => ({
        id: objectiveSequence,
        name: `Obj ${objectiveSequence}`,
        total: data.total,
        completed: data.completed,
        percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }));

    const overdueActions = filteredActions
      .filter((action) => isActionLate(action, hoje))
      .map((action) => ({
        uid: action.uid,
        id: getActionDisplayId(action.id),
        title: action.title,
        plannedEndDate: new Date(`${action.plannedEndDate}T00:00:00`).toLocaleDateString("pt-BR"),
        responsible: getResponsibleName(action),
        daysOverdue: Math.floor((hoje.getTime() - new Date(`${action.plannedEndDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const lateCompletions = filteredActions
      .filter((action) => {
        if (getDerivedActionStatus(action, hoje) !== "Concluído") return false;
        if (!action.endDate || !action.plannedEndDate) return false;
        return new Date(action.endDate) > new Date(action.plannedEndDate);
      })
      .map((action) => ({
        uid: action.uid,
        id: getActionDisplayId(action.id),
        title: action.title,
        plannedEndDate: new Date(`${action.plannedEndDate}T00:00:00`).toLocaleDateString("pt-BR"),
        actualEndDate: new Date(`${action.endDate}T00:00:00`).toLocaleDateString("pt-BR"),
        responsible: getResponsibleName(action),
        daysLate: Math.floor((new Date(action.endDate).getTime() - new Date(action.plannedEndDate).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => (b.daysLate || 0) - (a.daysLate || 0));

    const earlyCompletions = filteredActions
      .filter((action) => {
        if (getDerivedActionStatus(action, hoje) !== "Concluído") return false;
        if (!action.endDate || !action.plannedEndDate) return false;
        return new Date(action.endDate) < new Date(action.plannedEndDate);
      })
      .map((action) => ({
        uid: action.uid,
        id: getActionDisplayId(action.id),
        title: action.title,
        plannedEndDate: new Date(`${action.plannedEndDate}T00:00:00`).toLocaleDateString("pt-BR"),
        actualEndDate: new Date(`${action.endDate}T00:00:00`).toLocaleDateString("pt-BR"),
        responsible: getResponsibleName(action),
        daysEarly: Math.floor((new Date(action.plannedEndDate).getTime() - new Date(action.endDate).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => (b.daysEarly || 0) - (a.daysEarly || 0));

    const deadlineMap = DEADLINE_BUCKETS.reduce<Record<DeadlineBucketKey, ActionSummary[]>>((acc, bucket) => {
      acc[bucket.key] = [];
      return acc;
    }, {
      Atrasadas: [],
      Hoje: [],
      "7 Dias": [],
      "30 Dias": [],
      Futuro: [],
    });

    filteredActions.forEach((action) => {
      const bucket = getDeadlineBucket(action, hoje);
      if (bucket) {
        deadlineMap[bucket].push(toActionSummary(action));
      }
    });

    const deadlineHorizonWithActions: DeadlineItem[] = DEADLINE_BUCKETS.map((bucket) => ({
      name: bucket.key,
      value: deadlineMap[bucket.key].length,
      color: bucket.color,
      actions: deadlineMap[bucket.key],
    }));

    const statusWithActions: StatusItem[] = STATUS_BUCKETS.map((bucket) => ({
      name: bucket.name,
      value: filteredActions.filter((action) => getDerivedActionStatus(action, hoje) === bucket.status).length,
      color: bucket.color,
      actions: filteredActions
        .filter((action) => getDerivedActionStatus(action, hoje) === bucket.status)
        .map((action) => toActionSummary(action)),
    })).filter((item) => item.value > 0);

    return {
      objectiveProgress,
      overdueActions,
      microCoverage,
      deadlineHorizonWithActions,
      statusWithActions,
      lateCompletions,
      earlyCompletions,
    };
  }, [filteredData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <AdminOverviewKpiSection metrics={metrics} pendingCount={pendingCount} onOpenModal={setOpenModal} onTabChange={onTabChange} />

      <AdminOverviewChartsSection metrics={metrics} statusData={statusData} onOpenModal={setOpenModal}>
        {children}
      </AdminOverviewChartsSection>

      <KpiDetailModal
        type="conclusao"
        isOpen={openModal === "conclusao"}
        onClose={() => setOpenModal(null)}
        objectiveProgress={detailedData.objectiveProgress}
        totalActions={metrics.totalAcoes}
        completedActions={metrics.concluidas}
        completionRate={metrics.taxaConclusao}
      />
      <KpiDetailModal
        type="risco"
        isOpen={openModal === "risco"}
        onClose={() => setOpenModal(null)}
        overdueActions={detailedData.overdueActions}
      />
      <KpiDetailModal
        type="cobertura"
        isOpen={openModal === "cobertura"}
        onClose={() => setOpenModal(null)}
        microCoverage={detailedData.microCoverage}
        coverageRate={metrics.taxaCobertura}
        onViewMicro={onViewMicro}
      />
      <KpiDetailModal
        type="horizonte"
        isOpen={openModal === "horizonte"}
        onClose={() => setOpenModal(null)}
        deadlineHorizon={detailedData.deadlineHorizonWithActions}
      />
      <KpiDetailModal
        type="status"
        isOpen={openModal === "status"}
        onClose={() => setOpenModal(null)}
        statusData={detailedData.statusWithActions}
        totalActions={metrics.totalAcoes}
      />

      <ReprogrammedActionsModal
        isOpen={openModal === "reprogramadas"}
        onClose={() => setOpenModal(null)}
        metrics={metrics}
        detailedData={detailedData}
      />
    </div>
  );
}
