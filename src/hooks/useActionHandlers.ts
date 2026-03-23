import { useCallback } from 'react';
import { Action, RaciRole, Status, findActionByUid, getNextActionNumber, ActionTag, ActionComment } from '../types';
import * as actionsService from '../services/actionsService';
import * as tagsService from '../services/tagsService';
import { addComment, loadActionComments, processMentions } from '../services/commentsService';
import { recordActionAuditEvent } from '../services/actionAuditService';
import { useToast } from '../components/common/Toast';
import { useLatest } from './useLatest';
import { formatISODate, parseDateLocal } from '../lib/date';
import { clampProgress } from '../lib/validation';
import { log, logWarn, logError } from '../lib/logger';

function getActionAuditPayload(action: Pick<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'title'>) {
  return {
    uid: action.uid,
    id: action.id,
    activityId: action.activityId,
    microregiaoId: action.microregiaoId,
    title: action.title,
  };
}

interface UseActionHandlersProps {
  // State
  actions: Action[];
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  expandedActionUid: string | null;
  setExpandedActionUid: (uid: string | null) => void;
  pendingNewActionUid: string | null;
  setPendingNewActionUid: (uid: string | null) => void;

  // Context / Props
  selectedActivity: string;
  setSelectedActivity: (activityId: string) => void;
  currentMicroId: string;
  createActionMicroId: string;
  viewMode: string;
  setViewMode: (mode: 'table' | 'gantt' | 'team' | 'optimized' | 'calendar') => void;
  isDemoMode: boolean;
  isAdmin: boolean;
  isViewingAllMicros: boolean;

  // Permissions
  checkCanEdit: (action: Action) => boolean;
  checkCanDelete: (action: Action) => boolean;
  checkCanCreate: () => boolean;
  checkCanManageTeam: (action: Action) => boolean;

  // Refs / Others
  allTeams: any[];
  currentTeam: any[];
  setIsSaving: (saving: boolean) => void;
  setConfirmModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;

  // For Create in Admin mode
  setIsCreateActionModalOpen?: (isOpen: boolean) => void;
}

export function useActionHandlers({
  actions,
  setActions,
  expandedActionUid,
  setExpandedActionUid,
  pendingNewActionUid,
  setPendingNewActionUid,

  selectedActivity,
  setSelectedActivity,
  currentMicroId,
  createActionMicroId,
  viewMode,
  setViewMode,
  isDemoMode,
  isAdmin,
  isViewingAllMicros,

  checkCanEdit,
  checkCanDelete,
  checkCanCreate,
  checkCanManageTeam,

  allTeams,
  currentTeam,
  setIsSaving,
  setConfirmModal,
  setIsCreateActionModalOpen
}: UseActionHandlersProps) {
  const { showToast } = useToast();

  // Performance optimization: Keep latest actions in a ref to avoid 
  // dependency cycles in async callbacks (Pattern: advanced-use-latest)
  const actionsRef = useLatest(actions);

  type EditableActionField = 'title' | 'status' | 'startDate' | 'plannedEndDate' | 'endDate' | 'progress' | 'notes';

  // 1. UPDATE ACTION (Local State)
  const handleUpdateAction = useCallback((uid: string, field: EditableActionField | string, value: string | number) => {
    // Permission check
    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica para editar', 'error');
      return;
    }

    // Note: We use the ref here for finding, but we need to update state via setActions
    // For the update logic itself, we iterate on previous state to be safe.
    const action = findActionByUid(actionsRef.current, uid);

    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    if (!isAdmin && action.microregiaoId !== currentMicroId) {
      showToast('Você não pode editar ações de outra microrregião', 'error');
      return;
    }

    if (!checkCanEdit(action)) {
      showToast('Você não tem permissão para editar esta ação', 'error');
      return;
    }

    setActions(prev => prev.map(a => {
      if (a.uid !== uid) return a;
      const next = { ...a };

      if (field === 'progress') {
        next.progress = clampProgress(value);
      } else {
        (next as Record<string, unknown>)[field] = value;
      }

      // Validate Dates
      const start = parseDateLocal(next.startDate);
      const planned = parseDateLocal(next.plannedEndDate);
      const end = parseDateLocal(next.endDate);

      if (start && planned && planned < start) {
        next.plannedEndDate = formatISODate(start) || '';
      }
      if (start && end && end < start) {
        next.endDate = formatISODate(start) || '';
      }

      return next;
    }));
  }, [actionsRef, showToast, isViewingAllMicros, isAdmin, currentMicroId, checkCanEdit, setActions]);

  // 2. SAVE ACTION (Persist)
  const handleSaveAction = useCallback(async (uid?: string) => {
    if (isDemoMode) {
      showToast('Modo Visualização: Alterações não são salvas.', 'warning');
      setExpandedActionUid(null);
      return;
    }

    const targetUid = uid || expandedActionUid;
    if (!targetUid) {
      showToast('Nenhuma ação selecionada', 'error');
      return;
    }

    // Use Latest Ref
    const action = findActionByUid(actionsRef.current, targetUid);

    if (!action) {
      logError('useActionHandlers', 'Ação não encontrada para UID', { targetUid });
      showToast('Ação não encontrada', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const isNewAction = pendingNewActionUid === targetUid;

      if (isNewAction) {
        // CREATE
        const parts = action.id.split('.');
        const actionNumber = parseInt(parts[parts.length - 1], 10);

        const savedAction = await actionsService.createAction({
          microregiaoId: action.microregiaoId,
          activityId: action.activityId,
          actionNumber,
          title: action.title,
        });

        // Update other fields
        if (action.status !== 'Não Iniciado' || action.startDate || action.plannedEndDate || action.progress > 0) {
          await actionsService.updateAction(savedAction.uid, {
            status: action.status,
            startDate: action.startDate,
            plannedEndDate: action.plannedEndDate,
            endDate: action.endDate,
            progress: action.progress,
            notes: action.notes,
          });
        }

        // Replace temp logic with real one in state
        setActions(prev => prev.map(a =>
          a.uid === targetUid ? { ...savedAction, ...action, uid: savedAction.uid } : a
        ));

        setPendingNewActionUid(null);
        showToast('Ação criada com sucesso!', 'success');
      } else {
        // UPDATE
        await actionsService.updateAction(targetUid, {
          title: action.title,
          status: action.status,
          startDate: action.startDate,
          plannedEndDate: action.plannedEndDate,
          endDate: action.endDate,
          progress: action.progress,
          notes: action.notes,
        });
        void recordActionAuditEvent({
          type: 'action_updated',
          action: getActionAuditPayload(action),
          metadata: { source: 'handleSaveAction' },
        });
        showToast('Ação salva com sucesso!', 'success');
      }

      setExpandedActionUid(null);
    } catch (error: any) {
      logError('useActionHandlers', 'Erro ao salvar ação', error);
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    isDemoMode,
    expandedActionUid,
    actionsRef,
    pendingNewActionUid,
    showToast,
    setExpandedActionUid,
    setIsSaving,
    setPendingNewActionUid,
    setActions
  ]);

  const upsertActionList = useCallback((currentActions: Action[], savedAction: Action): Action[] => {
    const exists = currentActions.some(a => a.uid === savedAction.uid);
    if (exists) {
      return currentActions.map(a => (a.uid === savedAction.uid ? savedAction : a));
    }
    return [...currentActions, savedAction];
  }, []);

  const upsertActionInState = useCallback((savedAction: Action) => {
    setActions(prev => upsertActionList(prev, savedAction));
  }, [setActions, upsertActionList]);

  // 3. CLOSE ACTION MODAL
  const handleCloseActionModal = useCallback(() => {
    if (pendingNewActionUid && expandedActionUid === pendingNewActionUid) {
      setActions(prev => prev.filter(a => a.uid !== pendingNewActionUid));
      setPendingNewActionUid(null);
      showToast('Ação descartada', 'info');
    }

    setExpandedActionUid(null);
  }, [expandedActionUid, pendingNewActionUid, setActions, setExpandedActionUid, setPendingNewActionUid, showToast]);

  // 4. CREATE ACTION IN SPECIFIC MICRO
  const handleConfirmCreateInMicro = useCallback(() => {
    if (!createActionMicroId) {
      showToast('Selecione uma microrregião', 'error');
      return;
    }

    if (setIsCreateActionModalOpen) {
      setIsCreateActionModalOpen(false);
    }

    setTimeout(() => {
      const nextNum = getNextActionNumber(actionsRef.current, selectedActivity, createActionMicroId);
      const actionId = `${selectedActivity}.${nextNum}`;
      const tempUid = `${createActionMicroId}::${actionId}`;

      const tempAction: Action = {
        uid: tempUid,
        id: actionId,
        activityId: selectedActivity,
        microregiaoId: createActionMicroId,
        title: '',
        status: 'Não Iniciado',
        startDate: '',
        plannedEndDate: '',
        endDate: '',
        progress: 0,
        raci: [],
        notes: '',
        comments: [],
        tags: [],
      };

      setActions(prev => [...prev, tempAction]);
      setPendingNewActionUid(tempUid);
      if (viewMode === 'gantt') setViewMode('table');
      setExpandedActionUid(tempUid);
      showToast('Preencha os dados e clique em Salvar', 'info');
    }, 100);
  }, [
    actionsRef,
    createActionMicroId,
    selectedActivity,
    setActions,
    setExpandedActionUid,
    setPendingNewActionUid,
    setViewMode,
    setIsCreateActionModalOpen,
    showToast,
    viewMode,
  ]);

  // 5. EXPAND ACTION
  const handleExpandAction = useCallback(async (uid: string | null) => {
    if (!uid) {
      setExpandedActionUid(null);
      return;
    }

    setExpandedActionUid(uid);

    const action = findActionByUid(actionsRef.current, uid);
    if (action && pendingNewActionUid !== uid) {
      void recordActionAuditEvent({
        type: 'action_viewed',
        action: getActionAuditPayload(action),
        metadata: { source: 'handleExpandAction' },
      });
    }
    if (action && (action.commentCount || 0) > 0 && action.comments.length === 0) {
      try {
        const comments = await loadActionComments(uid);
        setActions(prev => prev.map(a => (a.uid === uid ? { ...a, comments } : a)));
      } catch (error) {
        logError('useActionHandlers', 'Erro ao carregar comentários on-demand', error);
      }
    }
  }, [actionsRef, pendingNewActionUid, setActions, setExpandedActionUid]);

  // 6. OPEN ACTION FROM GANTT
  const handleGanttActionClick = useCallback((action: Action) => {
    setSelectedActivity(action.activityId);
    void handleExpandAction(action.uid);
  }, [handleExpandAction, setSelectedActivity]);

  // 7. SAVE FULL ACTION (Draft modal)
  const handleSaveFullAction = useCallback(async (updatedAction: Action) => {
    setIsSaving(true);
    try {
      const isNewAction = pendingNewActionUid === updatedAction.uid;
      const saved = await actionsService.upsertAction(updatedAction);
      if (!isNewAction) {
        void recordActionAuditEvent({
          type: 'action_updated',
          action: getActionAuditPayload(saved),
          metadata: { source: 'handleSaveFullAction' },
        });
      }
      upsertActionInState(saved);
      setPendingNewActionUid(null);
      setExpandedActionUid(null);
      showToast('Ação salva com sucesso!', 'success');
    } catch (error: any) {
      logError('useActionHandlers', 'Erro ao salvar ação (full)', error);
      showToast(`Erro ao salvar ação: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [pendingNewActionUid, showToast, setExpandedActionUid, setIsSaving, setPendingNewActionUid, upsertActionInState]);

  // 8. SAVE AND NEW (Draft modal)
  const handleSaveAndNewAction = useCallback(async (updatedAction: Action) => {
    setIsSaving(true);
    try {
      const isNewAction = pendingNewActionUid === updatedAction.uid;
      const saved = await actionsService.upsertAction(updatedAction);
      if (!isNewAction) {
        void recordActionAuditEvent({
          type: 'action_updated',
          action: getActionAuditPayload(saved),
          metadata: { source: 'handleSaveAndNewAction' },
        });
      }
      const actionsWithSaved = upsertActionList(actionsRef.current, saved);
      showToast('Ação salva! Criando próxima...', 'success');

      setPendingNewActionUid(null);

      const nextNum = getNextActionNumber(actionsWithSaved, selectedActivity, updatedAction.microregiaoId);
      const actionId = `${selectedActivity}.${nextNum}`;
      const tempUid = `${updatedAction.microregiaoId}::${actionId}`;

      const tempAction: Action = {
        uid: tempUid,
        id: actionId,
        activityId: selectedActivity,
        microregiaoId: updatedAction.microregiaoId,
        title: 'Nova Ação',
        status: 'Não Iniciado',
        startDate: '',
        plannedEndDate: '',
        endDate: '',
        progress: 0,
        raci: [],
        notes: '',
        comments: [],
        tags: [],
      };

      setActions(prev => [...upsertActionList(prev, saved), tempAction]);
      setPendingNewActionUid(tempUid);
      setExpandedActionUid(tempUid);
    } catch (error: any) {
      logError('useActionHandlers', 'Erro no fluxo salvar e nova ação', error);
      showToast(`Erro: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [actionsRef, pendingNewActionUid, selectedActivity, setActions, setExpandedActionUid, setIsSaving, setPendingNewActionUid, showToast, upsertActionList]);

  // 9. CREATE START (UI)
  const handleCreateAction = useCallback(() => {
    // Admin View All -> Needs Modal
    if (isAdmin && isViewingAllMicros) {
      if (setIsCreateActionModalOpen) setIsCreateActionModalOpen(true);
      return;
    }

    if (!checkCanCreate()) {
      showToast('Você não tem permissão para criar ações', 'error');
      return;
    }

    if (!currentMicroId || currentMicroId === 'all') {
      showToast('Escolha uma microrregião para criar ações', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Modo Visualização: Não é possível criar ações.', 'warning');
      return;
    }

    const nextNum = getNextActionNumber(actionsRef.current, selectedActivity, currentMicroId);
    const actionId = `${selectedActivity}.${nextNum}`;
    const tempUid = `${currentMicroId}::${actionId}`;

    const tempAction: Action = {
      uid: tempUid,
      id: actionId,
      activityId: selectedActivity,
      microregiaoId: currentMicroId,
      title: 'Nova Ação',
      status: 'Não Iniciado',
      startDate: '',
      plannedEndDate: '',
      endDate: '',
      progress: 0,
      raci: [],
      notes: '',
      comments: [],
      tags: [],
    };

    setActions(prev => [...prev, tempAction]);
    setPendingNewActionUid(tempUid);
    if (viewMode === 'gantt' && setViewMode) setViewMode('table');
    setExpandedActionUid(tempUid);
    showToast('Preencha os dados e clique em Salvar', 'info');
  }, [
    isAdmin,
    isViewingAllMicros,
    setIsCreateActionModalOpen,
    checkCanCreate,
    showToast,
    currentMicroId,
    isDemoMode,
    actionsRef,
    selectedActivity,
    setActions,
    setPendingNewActionUid,
    viewMode,
    setViewMode,
    setExpandedActionUid
  ]);

  // 10. DELETE
  const handleDeleteAction = useCallback((uid: string) => {
    if (isDemoMode) {
      showToast('Modo Visualização: Não é possível excluir ações.', 'warning');
      return;
    }

    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica para excluir', 'error');
      return;
    }

    const action = findActionByUid(actionsRef.current, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    if (!isAdmin && action.microregiaoId !== currentMicroId) {
      showToast('Você não pode excluir ações de outra microrregião', 'error');
      return;
    }

    if (!checkCanDelete(action)) {
      showToast('Você não tem permissão para excluir esta ação', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Excluir Ação',
      message: `Tem certeza que deseja excluir "${action.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          // Optimistic / clean up immediately
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { } });

          await actionsService.deleteAction(uid);
          void recordActionAuditEvent({
            type: 'action_deleted',
            action: getActionAuditPayload(action),
            metadata: { source: 'handleDeleteAction' },
          });
          setActions(prev => prev.filter(a => a.uid !== uid));
          setExpandedActionUid(null);
          showToast('Ação excluída!', 'success');
        } catch (error: any) {
          logError('useActionHandlers', 'Erro ao excluir', error);
          showToast(`Erro ao excluir: ${error.message}`, 'error');
        }
      }
    });

  }, [isDemoMode, isViewingAllMicros, isAdmin, actionsRef, currentMicroId, checkCanDelete, showToast, setConfirmModal, setActions, setExpandedActionUid]);

  // 11. TEAM / RACI
  const handleAddRaci = useCallback(async (uid: string, memberId: string, role: RaciRole) => {
    if (isViewingAllMicros && !isAdmin) return;

    const action = findActionByUid(actionsRef.current, uid);
    if (!action || !checkCanManageTeam(action)) {
      showToast('Não permitido', 'error');
      return;
    }

    const teamToSearch = isAdmin && isViewingAllMicros ? allTeams : currentTeam;
    const member = teamToSearch.find((m: any) => m.id === memberId || m.id === parseInt(memberId));

    if (!member) {
      showToast('Membro não encontrado', 'error');
      return;
    }

    if (action.raci.some(r => r.name === member.name)) {
      showToast('Membro já na equipe', 'warning');
      return;
    }

    // Optimistic Update
    const previousRaci = action.raci;
    const newRaci = [...previousRaci, { name: member.name, role }];
    setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: newRaci } : a));

    try {
      await actionsService.addRaciMember(uid, member.name, role);
      showToast('Membro adicionado!', 'success');
    } catch (error) {
      // Rollback da UI otimista em caso de falha no persist
      setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: previousRaci } : a));
      logError('useActionHandlers', 'Erro ao adicionar membro RACI', error);
      showToast('Erro ao salvar equipe', 'error');
    }

  }, [actionsRef, checkCanManageTeam, allTeams, currentTeam, isAdmin, isViewingAllMicros, showToast, setActions]);

  const handleRemoveRaci = useCallback((uid: string, idx: number, memberName: string) => {
    // Check permissions (same as above)
    const action = findActionByUid(actionsRef.current, uid);
    if (!action || !checkCanManageTeam(action)) return;

    setConfirmModal({
      isOpen: true,
      title: 'Remover Membro',
      message: `Remover ${memberName}?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { } });

        const previousRaci = action.raci;
        const newRaci = previousRaci.filter((_, i) => i !== idx);
        setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: newRaci } : a));

        try {
          await actionsService.removeRaciMember(uid, memberName);
          showToast('Membro removido', 'success');
        } catch (error) {
          // Rollback da UI otimista em caso de falha no persist
          setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: previousRaci } : a));
          logError('useActionHandlers', 'Erro ao remover membro RACI', error);
          showToast('Erro ao salvar', 'error');
        }
      }
    });
  }, [actionsRef, checkCanManageTeam, setConfirmModal, setActions, showToast]);

  // 12. Comments
  const handleAddComment = useCallback(async (
    uid: string,
    content: string,
    parentId?: string | null
  ): Promise<ActionComment | null> => {
    // API call to create comment
    try {
      const newComment = await addComment(uid, content, parentId);
      setActions(prev => prev.map(a =>
        a.uid === uid
          ? {
            ...a,
            comments: [...(a.comments || []), newComment],
            commentCount: (a.commentCount ?? a.comments?.length ?? 0) + 1
          }
          : a
      ));

      const action = findActionByUid(actionsRef.current, uid);
      if (action && content.includes('@')) {
        void processMentions(content, action.title, newComment.authorName).catch((error) => {
          logError('useActionHandlers', 'Erro ao processar menções em comentário', error);
        });
      }
      return newComment;
    } catch (error) {
      logError('useActionHandlers', 'Erro ao adicionar comentario', error);
      showToast('Erro ao adicionar comentário', 'error');
      return null;
    }
  }, [actionsRef, setActions, showToast]);

  // 13. BULK CREATE (Smart Paste Import)
  const handleBulkCreateActions = useCallback(async (parsedActions: Array<{
    title: string;
    area: string;
    status: Status;
    startDate: string;
    plannedEndDate: string;
  }>) => {
    if (isDemoMode) {
      showToast('Modo Visualização: Não é possível criar ações.', 'warning');
      return;
    }

    if (!currentMicroId || currentMicroId === 'all') {
      showToast('Selecione uma microrregião para importar ações', 'error');
      return;
    }

    if (!checkCanCreate()) {
      showToast('Você não tem permissão para criar ações', 'error');
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;
    const createdActions: Action[] = [];

    try {
      // 1. Carregar tags existentes para evitar duplicatas e minimizar calls
      const existingTags = await tagsService.loadTags(currentMicroId);
      // Mapa para busca rápida: NAME_UPPER -> Tag
      const tagMap = new Map<string, ActionTag>();
      existingTags.forEach(t => tagMap.set(t.name.toUpperCase(), t));

      // 2. Calcular número inicial
      let nextNum = getNextActionNumber(actionsRef.current, selectedActivity, currentMicroId);

      for (const parsed of parsedActions) {
        try {
          // Cria a ação
          const savedAction = await actionsService.createAction({
            microregiaoId: currentMicroId,
            activityId: selectedActivity,
            actionNumber: nextNum,
            title: parsed.title,
          });

          // Incrementa para próxima iteração
          nextNum++;

          // Atualiza com datas e status se fornecidos
          const updates: Partial<Omit<Action, 'uid' | 'id' | 'activityId' | 'microregiaoId' | 'comments' | 'raci'>> = {};
          if (parsed.status !== 'Não Iniciado') updates.status = parsed.status;
          if (parsed.startDate) updates.startDate = parsed.startDate;
          if (parsed.plannedEndDate) updates.plannedEndDate = parsed.plannedEndDate;
          // NOTA: 'parsed.area' agora é convertida em TAGS, não mais em notes.

          if (Object.keys(updates).length > 0) {
            await actionsService.updateAction(savedAction.uid, updates);
          }

          // Processamento de TAGS (Áreas Envolvidas)
          const actionTags: ActionTag[] = [];
          if (parsed.area && parsed.area.trim()) {
            // Separa por vírgula ou ponto e vírgula e remove espaços extras
            const areaNames = parsed.area.split(/[;,]+/).map(s => s.trim()).filter(Boolean);

            for (const areaName of areaNames) {
              const upperName = areaName.toUpperCase();
              let tag = tagMap.get(upperName);

              if (!tag) {
                // Cria nova tag se não existir
                try {
                  tag = await tagsService.createTag(areaName);
                  tagMap.set(upperName, tag); // Atualiza cache local
                } catch {
                  // Se falhar (ex: duplicidade não pega no load inicial), tenta buscar do banco
                  logWarn('useActionHandlers', `Tentativa de criar tag '${areaName}' falhou, buscando existente...`);
                  try {
                    const existingData = await tagsService.loadTags();
                    const found = existingData.find(t => t.name.toUpperCase() === upperName);
                    if (found) {
                      tag = found;
                      tagMap.set(upperName, tag);
                    } else {
                      logError('useActionHandlers', `Erro fatal: Tag '${areaName}' não criada e não encontrada.`);
                      continue;
                    }
                  } catch (retryErr) {
                    logError('useActionHandlers', `Erro ao recuperar tag existente '${areaName}'`, retryErr);
                    continue; // Pula essa tag se falhar
                  }
                }
              }

              // Associa tag a acao
              if (tag) {
                try {
                  const { dbId } = savedAction;
                  if (!dbId) logWarn('useActionHandlers', `[BulkImport] ALERTA: dbId ausente para a ação ${savedAction.uid}`);
                  else log('useActionHandlers', `[BulkImport] Associando tag ${tag.name} para ação ${savedAction.uid} (DB ID: ${dbId})`);

                  // Passamos o dbId (UUID) diretamente para evitar lookup e race conditions
                  await tagsService.addTagToAction(savedAction.uid, tag.id, dbId);

                  // Verifica duplicidade no array local
                  if (!actionTags.some(t => t.id === tag!.id)) {
                    actionTags.push(tag);
                  }
                } catch (e) {
                  logError('useActionHandlers', `Erro ao associar tag '${areaName}' para ação`, e);
                }
              }
            }
          }

          // Adiciona ao state local
          const fullAction: Action = {
            ...savedAction,
            status: parsed.status,
            startDate: parsed.startDate,
            plannedEndDate: parsed.plannedEndDate,
            notes: '', // Limpo, pois movemos para tags
            tags: actionTags, // Tags adicionadas agora aparecem na UI
          };

          createdActions.push(fullAction);
          successCount++;
        } catch (err) {
          logError('useActionHandlers', 'Erro ao criar ação em lote', err);
          errorCount++;
        }
      }

      if (createdActions.length > 0) {
        // Atualiza estado uma ?nica vez para reduzir re-render em imports grandes
        setActions(prev => [...prev, ...createdActions]);
      }

      if (successCount > 0) {
        showToast(`${successCount} ${successCount === 1 ? 'ação criada' : 'ações criadas'} com sucesso!`, 'success');
      }
      if (errorCount > 0) {
        showToast(`${errorCount} ${errorCount === 1 ? 'ação falhou' : 'ações falharam'}`, 'error');
      }
    } catch (err) {
      logError('useActionHandlers', 'Erro fatal no processo em lote', err);
      showToast('Erro ao processar importação', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [isDemoMode, currentMicroId, checkCanCreate, setIsSaving, actionsRef, selectedActivity, showToast, setActions]);

  return {
    handleUpdateAction,
    handleSaveAction,
    handleCloseActionModal,
    handleConfirmCreateInMicro,
    handleExpandAction,
    handleGanttActionClick,
    handleSaveFullAction,
    handleSaveAndNewAction,
    handleCreateAction,
    handleDeleteAction,
    handleAddRaci,
    handleRemoveRaci,
    handleAddComment,
    handleBulkCreateActions,
  };
}

