import { getMicroregiaoById, getMicroregioesByMacro } from "../data/microregioes";
import {
  getDerivedActionStatus,
  getUpcomingActions,
  summarizeActionPortfolio,
} from "./actionPortfolio";
import { parseDateLocal } from "./date";
import { getActionDisplayId } from "./text";
import type { Action } from "../types";

type HealthTone = "critical" | "warning" | "positive" | "neutral";
type TrendDirection = "up" | "down" | "stable";

export interface MicroInsightsUserLike {
  ativo?: boolean | null;
  microregiaoId: string;
}

export interface MicroHealthScore {
  score: number;
  tone: HealthTone;
  label: string;
  summary: string;
}

export interface MicroTrend {
  direction: TrendDirection;
  currentPeriodCompleted: number;
  previousPeriodCompleted: number;
  label: string;
  summary: string;
}

export interface MicroBenchmark {
  macroName: string;
  averageProgress: number;
  averageHealthScore: number;
  differenceFromMacro: number;
  direction: "above" | "below" | "aligned";
  rank: number;
  totalPeers: number;
}

export interface MicroAlert {
  id: string;
  tone: HealthTone;
  title: string;
  description: string;
}

export interface MicroUpcomingAction {
  uid: string;
  displayId: string;
  title: string;
  plannedEndDate: string;
  responsible?: string;
  status: Action["status"];
  daysRemaining: number;
}

export interface MicroTopPerformer {
  name: string;
  completedCount: number;
  assignedCount: number;
}

export interface MicroRecommendation {
  tone: HealthTone;
  title: string;
  description: string;
}

export interface MicroStatusBreakdown {
  completed: number;
  inProgress: number;
  notStarted: number;
  late: number;
}

export interface MicroDetailInsights {
  averageProgress: number;
  completionRate: number;
  totalActions: number;
  totalUsers: number;
  activeUsers: number;
  responsibleCoverage: number;
  statusBreakdown: MicroStatusBreakdown;
  healthScore: MicroHealthScore;
  trend: MicroTrend;
  benchmark: MicroBenchmark | null;
  alerts: MicroAlert[];
  upcomingActions: MicroUpcomingAction[];
  focusActions: Action[];
  topPerformer: MicroTopPerformer | null;
  recommendation: MicroRecommendation;
}

function toStartOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function getPrimaryResponsible(action: Action): string | undefined {
  return action.raci?.find((member) => member.role === "R")?.name;
}

function calculateAverageProgress(actions: Action[]): number {
  if (actions.length === 0) {
    return 0;
  }

  return Math.round(actions.reduce((sum, action) => sum + (action.progress || 0), 0) / actions.length);
}

function calculateHealthScore(input: {
  averageProgress: number;
  completed: number;
  late: number;
  responsibleCoverage: number;
  total: number;
}): MicroHealthScore {
  if (input.total === 0) {
    return {
      score: 0,
      tone: "neutral",
      label: "Sem tracao",
      summary: "Ainda nao ha acoes suficientes para medir a saude operacional desta micro.",
    };
  }

  const completionRate = (input.completed / input.total) * 100;
  const latePenalty = (input.late / input.total) * 100;
  const rawScore = (
    completionRate * 0.45 +
    input.averageProgress * 0.2 +
    (100 - latePenalty) * 0.25 +
    input.responsibleCoverage * 0.1
  );
  const score = Math.round(clamp(rawScore, 0, 100));

  if (score >= 80) {
    return {
      score,
      tone: "positive",
      label: "Saudavel",
      summary: "A micro entrega bem, sustenta ritmo e tem pouco risco acumulado.",
    };
  }

  if (score >= 60) {
    return {
      score,
      tone: "warning",
      label: "Em atencao",
      summary: "A execucao esta de pe, mas precisa de acompanhamento mais proximo.",
    };
  }

  return {
    score,
    tone: "critical",
    label: "Critica",
    summary: "O plano de acao pede intervencao imediata para recuperar prazo e cadencia.",
  };
}

function buildTrend(actions: Action[], today: Date): MicroTrend {
  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - 30);

  const previousStart = new Date(today);
  previousStart.setDate(previousStart.getDate() - 60);

  const completedInWindow = (start: Date, end: Date) =>
    actions.filter((action) => {
      const completedDate = parseDateLocal(action.endDate);
      if (!completedDate) {
        return false;
      }

      return completedDate >= start && completedDate < end;
    }).length;

  const currentPeriodCompleted = completedInWindow(currentStart, today);
  const previousPeriodCompleted = completedInWindow(previousStart, currentStart);
  const delta = currentPeriodCompleted - previousPeriodCompleted;

  if (currentPeriodCompleted === 0 && previousPeriodCompleted === 0) {
    return {
      direction: "stable",
      currentPeriodCompleted,
      previousPeriodCompleted,
      label: "Sem entregas recentes",
      summary: "Nenhuma acao foi concluida nos ultimos 60 dias.",
    };
  }

  if (delta > 0) {
    return {
      direction: "up",
      currentPeriodCompleted,
      previousPeriodCompleted,
      label: `+${delta} ${pluralize(delta, "entrega", "entregas")}`,
      summary: `${currentPeriodCompleted} concluidas nos ultimos 30 dias, acima do periodo anterior.`,
    };
  }

  if (delta < 0) {
    const absoluteDelta = Math.abs(delta);
    return {
      direction: "down",
      currentPeriodCompleted,
      previousPeriodCompleted,
      label: `-${absoluteDelta} ${pluralize(absoluteDelta, "entrega", "entregas")}`,
      summary: `${currentPeriodCompleted} concluidas nos ultimos 30 dias, abaixo do periodo anterior.`,
    };
  }

  return {
    direction: "stable",
    currentPeriodCompleted,
    previousPeriodCompleted,
    label: "Mesmo ritmo",
    summary: `${currentPeriodCompleted} concluidas nos ultimos 30 dias, no mesmo patamar do periodo anterior.`,
  };
}

function buildBenchmark(
  microId: string | "all",
  actions: Action[],
  today: Date,
): MicroBenchmark | null {
  if (microId === "all") {
    return null;
  }

  const micro = getMicroregiaoById(microId);
  if (!micro) {
    return null;
  }

  const peerMetrics = getMicroregioesByMacro(micro.macrorregiao)
    .map((peer) => {
      const peerActions = actions.filter((action) => action.microregiaoId === peer.id);
      if (peerActions.length === 0) {
        return null;
      }

      const summary = summarizeActionPortfolio(peerActions, today);
      const averageProgress = calculateAverageProgress(peerActions);
      const responsibleCoverage = peerActions.length > 0
        ? Math.round((peerActions.filter((action) => Boolean(getPrimaryResponsible(action))).length / peerActions.length) * 100)
        : 0;
      const healthScore = calculateHealthScore({
        averageProgress,
        completed: summary.completed,
        late: summary.late,
        responsibleCoverage,
        total: summary.total,
      }).score;

      return {
        averageProgress,
        healthScore,
        id: peer.id,
      };
    })
    .filter((item): item is { averageProgress: number; healthScore: number; id: string } => Boolean(item));

  if (peerMetrics.length < 2) {
    return null;
  }

  const averageProgress = Math.round(
    peerMetrics.reduce((sum, item) => sum + item.averageProgress, 0) / peerMetrics.length,
  );
  const averageHealthScore = Math.round(
    peerMetrics.reduce((sum, item) => sum + item.healthScore, 0) / peerMetrics.length,
  );
  const rankedPeers = [...peerMetrics].sort((left, right) => {
    if (right.healthScore !== left.healthScore) {
      return right.healthScore - left.healthScore;
    }

    return right.averageProgress - left.averageProgress;
  });

  const currentPeer = peerMetrics.find((item) => item.id === microId);
  if (!currentPeer) {
    return null;
  }

  const differenceFromMacro = currentPeer.healthScore - averageHealthScore;

  return {
    macroName: micro.macrorregiao,
    averageProgress,
    averageHealthScore,
    differenceFromMacro,
    direction: differenceFromMacro > 4 ? "above" : differenceFromMacro < -4 ? "below" : "aligned",
    rank: rankedPeers.findIndex((item) => item.id === microId) + 1,
    totalPeers: rankedPeers.length,
  };
}

function buildAlerts(input: {
  actions: Action[];
  responsibleCoverage: number;
  summary: ReturnType<typeof summarizeActionPortfolio>;
  topTrend: MicroTrend;
  totalUsers: number;
  upcomingActions: MicroUpcomingAction[];
  benchmark: MicroBenchmark | null;
  today: Date;
}): MicroAlert[] {
  const alerts: MicroAlert[] = [];

  if (input.summary.total === 0) {
    alerts.push({
      id: "no-actions",
      tone: "warning",
      title: "Plano de acao ainda nao iniciado",
      description: "Cadastre as primeiras acoes da micro para liberar acompanhamento, score e alertas operacionais.",
    });
    return alerts;
  }

  const overdueWithoutResponsible = input.actions.filter((action) => {
    return getDerivedActionStatus(action, input.today) === "Atrasado" && !getPrimaryResponsible(action);
  }).length;

  if (overdueWithoutResponsible > 0) {
    alerts.push({
      id: "overdue-without-owner",
      tone: "critical",
      title: `${overdueWithoutResponsible} ${pluralize(overdueWithoutResponsible, "acao atrasada esta", "acoes atrasadas estao")} sem responsavel`,
      description: "Defina um dono para evitar que o atraso fique invisivel na rotina da micro.",
    });
  }

  if (input.summary.late > 0) {
    alerts.push({
      id: "late-actions",
      tone: "critical",
      title: `${input.summary.late} ${pluralize(input.summary.late, "acao atrasada", "acoes atrasadas")}`,
      description: "Revise prazo, reprogramacao e capacidade de entrega antes que o risco se espalhe.",
    });
  }

  if (input.upcomingActions.length > 0) {
    alerts.push({
      id: "upcoming-actions",
      tone: "warning",
      title: `${input.upcomingActions.length} ${pluralize(input.upcomingActions.length, "entrega vence", "entregas vencem")} em 7 dias`,
      description: "Vale fazer acompanhamento fino para evitar migracao de prazo para o vermelho.",
    });
  }

  if (input.responsibleCoverage < 60) {
    alerts.push({
      id: "low-coverage",
      tone: "warning",
      title: "Cobertura de responsaveis abaixo do ideal",
      description: `${input.responsibleCoverage}% das acoes tem um responsavel definido. A meta minima sugerida e 60%.`,
    });
  }

  if (input.topTrend.direction === "stable" && input.topTrend.currentPeriodCompleted === 0) {
    alerts.push({
      id: "no-recent-deliveries",
      tone: "warning",
      title: "Sem conclusoes recentes",
      description: "A micro nao registrou entregas concluidas nos ultimos 30 dias.",
    });
  }

  if (input.totalUsers === 0) {
    alerts.push({
      id: "no-users",
      tone: "critical",
      title: "Sem usuarios vinculados",
      description: "Nao ha equipe cadastrada para sustentar a execucao local.",
    });
  }

  if (input.benchmark?.direction === "below") {
    alerts.push({
      id: "below-macro-average",
      tone: "warning",
      title: "Abaixo da media da macrorregiao",
      description: `O score desta micro esta ${Math.abs(input.benchmark.differenceFromMacro)} pontos abaixo da media da ${input.benchmark.macroName}.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "healthy-run",
      tone: "positive",
      title: "Operacao estavel",
      description: "Sem gargalo critico identificado. O foco agora e manter cadencia e antecipar riscos.",
    });
  }

  return alerts.slice(0, 4);
}

function buildRecommendation(input: {
  alerts: MicroAlert[];
  benchmark: MicroBenchmark | null;
  healthScore: MicroHealthScore;
  upcomingActions: MicroUpcomingAction[];
}): MicroRecommendation {
  const noActionsAlert = input.alerts.find((alert) => alert.id === "no-actions");
  if (noActionsAlert) {
    return {
      tone: "warning",
      title: "Montar o primeiro plano de acao",
      description: "Escolha os objetivos prioritarios da micro, cadastre as primeiras acoes e defina responsaveis para liberar a leitura executiva completa.",
    };
  }

  const criticalAlert = input.alerts.find((alert) => alert.tone === "critical");
  if (criticalAlert) {
    return {
      tone: "critical",
      title: "Intervencao imediata",
      description: criticalAlert.description,
    };
  }

  if (input.upcomingActions.length > 0) {
    return {
      tone: "warning",
      title: "Acompanhar a semana",
      description: "As proximas entregas estao perto. Vale checar bloqueios e responsaveis antes do vencimento.",
    };
  }

  if (input.benchmark?.direction === "below") {
    return {
      tone: "warning",
      title: "Recuperar o ritmo da macro",
      description: `A micro esta abaixo da media da ${input.benchmark.macroName}. Compare praticas com as micros lideres da regiao.`,
    };
  }

  if (input.healthScore.tone === "positive") {
    return {
      tone: "positive",
      title: "Conservar o bom momento",
      description: "A micro esta performando bem. O ganho agora vem de manter cadencia e compartilhar boas praticas.",
    };
  }

  return {
    tone: "neutral",
    title: "Ajuste fino de execucao",
    description: "Priorize visibilidade de responsaveis, prazos claros e fechamento das proximas entregas.",
  };
}

function buildUpcomingActions(actions: Action[], today: Date): MicroUpcomingAction[] {
  return getUpcomingActions(actions, today, 7, 4).map((action) => {
    const plannedDate = parseDateLocal(action.plannedEndDate || action.endDate);
    const daysRemaining = plannedDate
      ? Math.ceil((plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      uid: action.uid,
      displayId: getActionDisplayId(action.id),
      title: action.title,
      plannedEndDate: action.plannedEndDate,
      responsible: getPrimaryResponsible(action),
      status: getDerivedActionStatus(action, today),
      daysRemaining,
    };
  });
}

function buildFocusActions(actions: Action[], today: Date): Action[] {
  const scoreAction = (action: Action): number => {
    const status = getDerivedActionStatus(action, today);
    const plannedDate = parseDateLocal(action.plannedEndDate || action.endDate);
    const daysRemaining = plannedDate
      ? Math.ceil((plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const hasResponsible = Boolean(getPrimaryResponsible(action));

    if (status === "Atrasado") {
      return 1000 + Math.max(0, 30 - daysRemaining) + (hasResponsible ? 0 : 20);
    }

    if (daysRemaining <= 7) {
      return 700 - daysRemaining + (hasResponsible ? 0 : 10);
    }

    if (status === "Em Andamento") {
      return 400 + action.progress;
    }

    return 100 + action.progress;
  };

  return [...actions]
    .sort((left, right) => scoreAction(right) - scoreAction(left))
    .slice(0, 6);
}

function buildTopPerformer(actions: Action[], today: Date): MicroTopPerformer | null {
  const performerMap = new Map<string, MicroTopPerformer>();

  actions.forEach((action) => {
    const responsible = getPrimaryResponsible(action);
    if (!responsible) {
      return;
    }

    const current = performerMap.get(responsible) || {
      name: responsible,
      completedCount: 0,
      assignedCount: 0,
    };

    current.assignedCount += 1;
    if (getDerivedActionStatus(action, today) === "Conclu\u00eddo") {
      current.completedCount += 1;
    }

    performerMap.set(responsible, current);
  });

  const performers = Array.from(performerMap.values()).sort((left, right) => {
    if (right.completedCount !== left.completedCount) {
      return right.completedCount - left.completedCount;
    }

    return right.assignedCount - left.assignedCount;
  });

  return performers[0] || null;
}

export function buildMicroDetailInsights(
  microId: string | "all",
  actions: Action[],
  users: MicroInsightsUserLike[],
  today: Date = new Date(),
): MicroDetailInsights {
  const safeToday = toStartOfDay(today);
  const microActions = microId === "all" ? actions : actions.filter((action) => action.microregiaoId === microId);
  const microUsers = microId === "all" ? users : users.filter((user) => user.microregiaoId === microId);
  const summary = summarizeActionPortfolio(microActions, safeToday);
  const averageProgress = calculateAverageProgress(microActions);
  const activeUsers = microUsers.filter((user) => user.ativo !== false).length;
  const responsibleCoverage = microActions.length > 0
    ? Math.round((microActions.filter((action) => Boolean(getPrimaryResponsible(action))).length / microActions.length) * 100)
    : 0;
  const healthScore = calculateHealthScore({
    averageProgress,
    completed: summary.completed,
    late: summary.late,
    responsibleCoverage,
    total: summary.total,
  });
  const trend = buildTrend(microActions, safeToday);
  const benchmark = buildBenchmark(microId, actions, safeToday);
  const upcomingActions = buildUpcomingActions(microActions, safeToday);
  const alerts = buildAlerts({
    actions: microActions,
    benchmark,
    responsibleCoverage,
    summary,
    today: safeToday,
    topTrend: trend,
    totalUsers: microUsers.length,
    upcomingActions,
  });

  return {
    averageProgress,
    completionRate: summary.percentConcluido,
    totalActions: summary.total,
    totalUsers: microUsers.length,
    activeUsers,
    responsibleCoverage,
    statusBreakdown: {
      completed: summary.completed,
      inProgress: summary.inProgress,
      notStarted: summary.notStarted,
      late: summary.late,
    },
    healthScore,
    trend,
    benchmark,
    alerts,
    upcomingActions,
    focusActions: buildFocusActions(microActions, safeToday),
    topPerformer: buildTopPerformer(microActions, safeToday),
    recommendation: buildRecommendation({
      alerts,
      benchmark,
      healthScore,
      upcomingActions,
    }),
  };
}
