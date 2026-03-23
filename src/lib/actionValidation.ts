/**
 * Utilitários para validação e filtragem de ações
 * 
 * Este módulo garante consistência na contagem de ações em todo o sistema,
 * eliminando:
 * - Ações órfãs (sem atividade válida)
 * - Ações com activityId inválido
 * 
 * @module actionValidation
 */

import { Action, Activity } from '../types';
import { summarizeActionPortfolio } from './actionPortfolio';
import { getComparableActivityId } from './text';

/**
 * Conjunto de IDs de atividades válidas
 */
export type ValidActivityIds = Set<string>;

/**
 * Resultado da validação de ações
 */
export interface ActionValidationResult {
  /** Ações válidas (com atividade existente) */
  validActions: Action[];
  /** Ações órfãs (atividade não existe) */
  orphanedActions: Action[];
  /** Ações com data válida (para agenda) */
  actionsWithDate: Action[];
  /** Ações sem data válida */
  actionsWithoutDate: Action[];
  /** Estatísticas */
  stats: {
    total: number;
    valid: number;
    orphaned: number;
    withDate: number;
    withoutDate: number;
  };
}

/**
 * Extrai todos os IDs de atividades de um Record de atividades por objetivo
 * @param activities - Record de atividades agrupadas por objetivo
 * @returns Set com todos os IDs de atividades válidas
 */
export function extractValidActivityIds(
  activities: Record<number, Activity[]>
): ValidActivityIds {
  const validIds = new Set<string>();
  
  Object.values(activities).forEach(activityList => {
    activityList.forEach(activity => {
      if (activity.id) {
        validIds.add(activity.id);
        validIds.add(getComparableActivityId(activity.id));
      }
    });
  });
  
  return validIds;
}

/**
 * Verifica se uma ação tem uma data válida para exibição na agenda
 * @param action - Ação a ser verificada
 * @returns true se a ação tem data válida
 */
export function hasValidDate(action: Action): boolean {
  const dateStr = action.startDate || action.plannedEndDate;
  if (!dateStr) return false;
  
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Verifica se uma ação é órfã (sua atividade não existe)
 * @param action - Ação a ser verificada
 * @param validActivityIds - Set com IDs de atividades válidas
 * @returns true se a ação é órfã
 */
export function isOrphanedAction(
  action: Action,
  validActivityIds: ValidActivityIds
): boolean {
  if (!action.activityId) return true;
  return !validActivityIds.has(action.activityId) && !validActivityIds.has(getComparableActivityId(action.activityId));
}

/**
 * Filtra ações removendo órfãs
 * @param actions - Lista de ações
 * @param activities - Record de atividades por objetivo
 * @returns Lista de ações válidas (não órfãs)
 */
export function filterOrphanedActions(
  actions: Action[],
  activities: Record<number, Activity[]>
): Action[] {
  const validActivityIds = extractValidActivityIds(activities);
  return actions.filter(action => !isOrphanedAction(action, validActivityIds));
}

/**
 * Filtra ações para a agenda (apenas com data válida)
 * @param actions - Lista de ações
 * @returns Lista de ações com data válida
 */
export function filterActionsForCalendar(actions: Action[]): Action[] {
  return actions.filter(hasValidDate);
}

/**
 * Valida e categoriza todas as ações
 * @param actions - Lista de ações
 * @param activities - Record de atividades por objetivo
 * @returns Resultado completo da validação
 */
export function validateActions(
  actions: Action[],
  activities: Record<number, Activity[]>
): ActionValidationResult {
  const validActivityIds = extractValidActivityIds(activities);
  
  const validActions: Action[] = [];
  const orphanedActions: Action[] = [];
  const actionsWithDate: Action[] = [];
  const actionsWithoutDate: Action[] = [];
  
  actions.forEach(action => {
    const isOrphaned = isOrphanedAction(action, validActivityIds);
    const hasDate = hasValidDate(action);
    
    if (isOrphaned) {
      orphanedActions.push(action);
    } else {
      validActions.push(action);
      
      if (hasDate) {
        actionsWithDate.push(action);
      } else {
        actionsWithoutDate.push(action);
      }
    }
  });
  
  return {
    validActions,
    orphanedActions,
    actionsWithDate,
    actionsWithoutDate,
    stats: {
      total: actions.length,
      valid: validActions.length,
      orphaned: orphanedActions.length,
      withDate: actionsWithDate.length,
      withoutDate: actionsWithoutDate.length,
    },
  };
}

/**
 * Cria um mapa de atividade para objetivo
 * @param activities - Record de atividades por objetivo
 * @returns Mapa de activityId -> objectiveId
 */
export function createActivityToObjectiveMap(
  activities: Record<number, Activity[]>
): Record<string, number> {
  const map: Record<string, number> = {};
  
  Object.entries(activities).forEach(([objId, acts]) => {
    acts.forEach(act => {
      map[act.id] = Number(objId);
      map[getComparableActivityId(act.id)] = Number(objId);
    });
  });
  
  return map;
}

/**
 * Filtra ações por microrregião
 * @param actions - Lista de ações
 * @param microId - ID da microrregião (null/'all' = todas)
 * @returns Ações filtradas
 */
export function filterActionsByMicro(
  actions: Action[],
  microId: string | null | undefined
): Action[] {
  if (!microId || microId === 'all') {
    return actions;
  }
  return actions.filter(a => a.microregiaoId === microId);
}

/**
 * Obtém estatísticas de ações para uma microrregião
 * Usado para garantir consistência entre Dashboard, Objetivos e Agenda
 */
export interface ActionStats {
  /** Total de ações válidas */
  total: number;
  /** Ações concluídas */
  completed: number;
  /** Ações em andamento */
  inProgress: number;
  /** Ações não iniciadas */
  notStarted: number;
  /** Ações atrasadas */
  late: number;
  /** Ações com data para agenda */
  scheduledCount: number;
  /** Ações sem data (não aparecem na agenda) */
  unscheduledCount: number;
  /** Percentual de conclusão */
  completionRate: number;
}

/**
 * Calcula estatísticas unificadas de ações
 * @param actions - Lista de ações (já filtradas por micro e sem órfãs)
 * @returns Estatísticas completas
 */
export function calculateActionStats(actions: Action[]): ActionStats {
  const summary = summarizeActionPortfolio(actions);
  
  const actionsWithDate = filterActionsForCalendar(actions);
  const scheduledCount = actionsWithDate.length;
  const unscheduledCount = summary.total - scheduledCount;
  
  return {
    total: summary.total,
    completed: summary.completed,
    inProgress: summary.inProgress,
    notStarted: summary.notStarted,
    late: summary.late,
    scheduledCount,
    unscheduledCount,
    completionRate: summary.percentConcluido,
  };
}
