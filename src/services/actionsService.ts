import type { Action, ActionComment, ActionTag, RaciMember } from '../types';
import { generateActionUid } from '../types';
import { log, logError } from '../lib/logger';
import { shouldUseBackendActionsApi } from './apiClient';
import {
  createActionViaBackendApi,
  deleteActionViaBackendApi,
  listActionsViaBackendApi,
  updateActionViaBackendApi,
  upsertActionViaBackendApi,
} from './actionsApi';
import { requireCurrentUserId } from './sessionService';
import { getActionDbIdByUid } from './actionLookupService';
import { recordAutomatedEvent } from './automatedEventsService';
import { mapActionDTOToAction, mapLoadedActionRowToAction, toActionUpdatePayload } from './actions/actionsService.mappers';
import {
  deleteActionRecord,
  fetchActionComments,
  fetchActionRaci,
  fetchMicroregiaoName,
  findActionRecordIdByUid,
  insertActionRaciMember,
  insertActionRecord,
  listActionRows,
  removeActionRaciMember,
  syncActionRaci,
  syncActionTags,
  updateActionRecord,
} from './actions/actionsService.repositories';

export async function loadActions(microregiaoId?: string): Promise<Action[]> {
  try {
    if (shouldUseBackendActionsApi()) {
      return await listActionsViaBackendApi(microregiaoId);
    }

    const rows = await listActionRows(microregiaoId);
    return rows.map(mapLoadedActionRowToAction);
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao carregar acoes', error);
    throw error;
  }
}

export async function createAction(input: {
  microregiaoId: string;
  activityId: string;
  actionNumber: number;
  title?: string;
}): Promise<Action & { dbId: string }> {
  try {
    if (shouldUseBackendActionsApi()) {
      return await createActionViaBackendApi(input);
    }

    const actionId = `${input.activityId}.${input.actionNumber}`;
    const uid = generateActionUid(input.microregiaoId, actionId);
    const currentUserId = await requireCurrentUserId('Usuario nao autenticado');

    const createdRecord = await insertActionRecord({
      uid,
      actionId,
      activityId: input.activityId,
      microregiaoId: input.microregiaoId,
      title: input.title || '',
      status: 'N\u00E3o Iniciado',
      progress: 0,
      notes: '',
      createdBy: currentUserId,
    });

    const newAction = mapActionDTOToAction(createdRecord, [], []);

    return {
      ...newAction,
      dbId: createdRecord.id,
    };
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao criar acao', error);
    throw error;
  }
}

export async function updateAction(
  uid: string,
  updates: Partial<Omit<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'comments' | 'raci'>>
): Promise<Action> {
  try {
    if (shouldUseBackendActionsApi()) {
      return await updateActionViaBackendApi(uid, updates);
    }

    const updatedRecord = await updateActionRecord(uid, toActionUpdatePayload(updates));
    if (!updatedRecord) {
      throw new Error('Acao nao encontrada');
    }

    const [raciData, commentsData] = await Promise.all([
      fetchActionRaci(updatedRecord.id),
      fetchActionComments(updatedRecord.id),
    ]);

    const updatedAction = mapActionDTOToAction(updatedRecord, raciData, commentsData);

    if (updates.status === 'Conclu\u00EDdo' || updates.progress === 100) {
      const microNome = (await fetchMicroregiaoName(updatedAction.microregiaoId)) || updatedAction.microregiaoId;
      await recordAutomatedEvent({
        type: 'plan_completed',
        municipality: microNome,
        title: `${microNome} concluiu mais uma a\u00E7\u00E3o do plano`,
        details: updatedAction.title,
        imageGradient: 'from-blue-600 to-cyan-500',
        footerContext: 'Marco de Execu\u00E7\u00E3o',
      });
    }

    return updatedAction;
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao atualizar acao', error);
    throw error;
  }
}

export async function upsertAction(action: Action): Promise<Action> {
  try {
    if (shouldUseBackendActionsApi()) {
      return await upsertActionViaBackendApi(action);
    }

    let actionDbId = await findActionRecordIdByUid(action.uid);

    if (actionDbId) {
      await updateAction(action.uid, {
        title: action.title,
        status: action.status,
        startDate: action.startDate,
        plannedEndDate: action.plannedEndDate,
        endDate: action.endDate,
        progress: action.progress,
        notes: action.notes,
      });
    } else {
      log('actionsService', 'Acao nao existe no banco, criando', action.uid);
      const currentUserId = await requireCurrentUserId('Usuario nao autenticado');

      const createdRecord = await insertActionRecord({
        uid: action.uid,
        actionId: action.id,
        activityId: action.activityId,
        microregiaoId: action.microregiaoId,
        title: action.title,
        status: action.status,
        progress: action.progress,
        notes: action.notes || '',
        createdBy: currentUserId,
        startDate: action.startDate,
        plannedEndDate: action.plannedEndDate,
        endDate: action.endDate,
      });

      actionDbId = createdRecord.id;
    }

    if (!actionDbId) {
      throw new Error('Acao nao encontrada');
    }

    if (action.raci) {
      try {
        await syncActionRaci(actionDbId, action.raci);
      } catch (error) {
        logError('actionsService', 'Erro ao sincronizar RACI', error);
      }
    }

    if (action.tags) {
      try {
        await syncActionTags(actionDbId, action.uid, action.tags);
      } catch (error) {
        logError('actionsService', 'Erro ao sincronizar tags', error);
      }
    }

    return action;
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao upsert acao', error);
    throw error;
  }
}

export async function deleteAction(uid: string): Promise<void> {
  try {
    if (shouldUseBackendActionsApi()) {
      await deleteActionViaBackendApi(uid);
      return;
    }

    await deleteActionRecord(uid);
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao excluir acao', error);
    throw error;
  }
}

export async function addRaciMember(
  actionUid: string,
  memberName: string,
  role: 'R' | 'A' | 'C' | 'I'
): Promise<RaciMember> {
  try {
    const actionId = await getActionDbIdByUid(actionUid);
    if (!actionId) {
      throw new Error('Acao nao encontrada');
    }

    const data = await insertActionRaciMember({
      actionDbId: actionId,
      memberName,
      role,
    });

    return {
      name: data.member_name,
      role: data.role as RaciMember['role'],
    };
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao adicionar membro RACI', error);
    throw error;
  }
}

export async function removeRaciMember(actionUid: string, memberName: string): Promise<void> {
  try {
    const actionId = await getActionDbIdByUid(actionUid);
    if (!actionId) {
      throw new Error('Acao nao encontrada');
    }

    await removeActionRaciMember(actionId, memberName);
  } catch (error) {
    logError('actionsService', 'Erro inesperado ao remover membro RACI', error);
    throw error;
  }
}

export type { ActionComment, ActionTag };
