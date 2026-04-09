import type { Action, Activity, Status } from '../types';
import { parseDateLocal } from './date';
import { getComparableActivityId } from './text';

export interface ActionPortfolioSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  late: number;
  percentConcluido: number;
}

function toStartOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

export function getActionComparableActivityId(action: Pick<Action, 'activityId'>): string {
  return getComparableActivityId(action.activityId);
}

export function buildComparableActivityIdSet(activities: Array<Pick<Activity, 'id'>>): Set<string> {
  return new Set(
    activities
      .map((activity) => getComparableActivityId(activity.id))
      .filter(Boolean),
  );
}

export function filterActionsByActivityIds(
  actions: Action[],
  activityIds: Iterable<string>,
): Action[] {
  const comparableIds = new Set(
    Array.from(activityIds)
      .map((activityId) => getComparableActivityId(activityId))
      .filter(Boolean),
  );

  return actions.filter((action) => comparableIds.has(getActionComparableActivityId(action)));
}

export function filterActionsByObjective(
  actions: Action[],
  activitiesByObjective: Record<number, Activity[]>,
  objectiveId: number,
): Action[] {
  return filterActionsByActivityIds(actions, (activitiesByObjective[objectiveId] || []).map((activity) => activity.id));
}

export function isActionCompleted(action: Action): boolean {
  return Boolean(parseDateLocal(action.endDate)) || action.status === 'Concluído' || action.progress >= 100;
}

export function isActionLate(action: Action, today: Date = new Date()): boolean {
  if (isActionCompleted(action)) {
    return false;
  }

  const plannedEndDate = parseDateLocal(action.plannedEndDate);

  if (!plannedEndDate) {
    return false;
  }

  return plannedEndDate < toStartOfDay(today);
}

export function getDerivedActionStatus(action: Action, today: Date = new Date()): Status {
  if (isActionCompleted(action)) {
    return 'Concluído';
  }

  if (isActionLate(action, today)) {
    return 'Atrasado';
  }

  if (action.progress > 0 || action.status === 'Em Andamento' || Boolean(parseDateLocal(action.startDate))) {
    return 'Em Andamento';
  }

  return 'Não Iniciado';
}

export function summarizeActionPortfolio(
  actions: Action[],
  today: Date = new Date(),
): ActionPortfolioSummary {
  const summary: ActionPortfolioSummary = {
    total: actions.length,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    late: 0,
    percentConcluido: 0,
  };

  actions.forEach((action) => {
    const status = getDerivedActionStatus(action, today);

    if (status === 'Concluído') summary.completed += 1;
    if (status === 'Em Andamento') summary.inProgress += 1;
    if (status === 'Não Iniciado') summary.notStarted += 1;
    if (status === 'Atrasado') summary.late += 1;
  });

  summary.percentConcluido = summary.total > 0
    ? Math.round((summary.completed / summary.total) * 100)
    : 0;

  return summary;
}

export function extractObjectiveSequenceFromActivityId(activityId: string): number | null {
  const comparableId = getComparableActivityId(activityId);
  const objectivePart = comparableId.split('.')[0];
  const objectiveNumber = Number.parseInt(objectivePart, 10);

  return Number.isNaN(objectiveNumber) ? null : objectiveNumber;
}

export function getUpcomingActions(
  actions: Action[],
  today: Date = new Date(),
  maxDaysAhead = 7,
  limit = 5,
): Action[] {
  const todayStart = toStartOfDay(today);

  return actions
    .filter((action) => {
      if (getDerivedActionStatus(action, todayStart) === 'Concluído') {
        return false;
      }

      const plannedDate = parseDateLocal(action.plannedEndDate || action.endDate);

      if (!plannedDate) {
        return false;
      }

      const diffDays = (plannedDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24);

      return diffDays >= 0 && diffDays <= maxDaysAhead;
    })
    .sort((left, right) => {
      const leftDate = parseDateLocal(left.plannedEndDate || left.endDate)?.getTime() || 0;
      const rightDate = parseDateLocal(right.plannedEndDate || right.endDate)?.getTime() || 0;

      return leftDate - rightDate;
    })
    .slice(0, limit);
}

/**
 * Ações com status derivado "Atrasado" cujo prazo planejado está entre 1 e `maxDelayDays` dias no passado
 * (espelha a janela de "Próximos prazos", mas para atraso em vez de vencimentos futuros).
 */
export function getDelayedActions(
  actions: Action[],
  today: Date = new Date(),
  maxDelayDays = 7,
  limit = 5,
): Action[] {
  const todayStart = toStartOfDay(today);

  return actions
    .filter((action) => {
      if (getDerivedActionStatus(action, todayStart) !== 'Atrasado') {
        return false;
      }

      const plannedDate = parseDateLocal(action.plannedEndDate || action.endDate);

      if (!plannedDate) {
        return false;
      }

      const overdueDays = Math.ceil(
        (todayStart.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return overdueDays >= 1 && overdueDays <= maxDelayDays;
    })
    .sort((left, right) => {
      const leftDate = parseDateLocal(left.plannedEndDate || left.endDate)?.getTime() || 0;
      const rightDate = parseDateLocal(right.plannedEndDate || right.endDate)?.getTime() || 0;

      return leftDate - rightDate;
    })
    .slice(0, limit);
}
