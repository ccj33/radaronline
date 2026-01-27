
import { useCallback } from 'react';
import { Action, RaciRole, ActionComment, Status, findActionByUid, getNextActionNumber, ActionTag } from '../types';
import * as dataService from '../services/dataService';
import { useToast } from '../components/common/Toast';
import { useLatest } from './useLatest';
import { formatISODate, parseDateLocal } from '../lib/date';
import { clampProgress } from '../lib/validation';
import { logError } from '../lib/logger';

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
  currentMicroId: string;
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
  currentMicroId,
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

        const savedAction = await dataService.createAction({
          microregiaoId: action.microregiaoId,
          activityId: action.activityId,
          actionNumber,
          title: action.title,
        });

        // Update other fields
        if (action.status !== 'Não Iniciado' || action.startDate || action.plannedEndDate || action.progress > 0) {
          await dataService.updateAction(savedAction.uid, {
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
        await dataService.updateAction(targetUid, {
          title: action.title,
          status: action.status,
          startDate: action.startDate,
          plannedEndDate: action.plannedEndDate,
          endDate: action.endDate,
          progress: action.progress,
          notes: action.notes,
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

  // 3. CREATE START (UI)
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

  // 4. DELETE
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

          await dataService.deleteAction(uid);
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

  // 5. TEAM / RACI
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
    const newRaci = [...action.raci, { name: member.name, role }];
    setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: newRaci } : a));

    try {
      await dataService.addRaciMember(uid, member.name, role);
      showToast('Membro adicionado!', 'success');
    } catch (err) {
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

        const newRaci = action.raci.filter((_, i) => i !== idx);
        setActions(prev => prev.map(a => a.uid === uid ? { ...a, raci: newRaci } : a));

        try {
          await dataService.removeRaciMember(uid, memberName);
          showToast('Membro removido', 'success');
        } catch (err) {
          showToast('Erro ao salvar', 'error');
        }
      }
    });
  }, [actionsRef, checkCanManageTeam, setConfirmModal, setActions, showToast]);

  // 6. Comments
  const handleAddComment = useCallback(async (uid: string, content: string) => {
    // API call to create comment
    try {
      const newComment = await dataService.addComment(uid, content);
      setActions(prev => prev.map(a =>
        a.uid === uid ? { ...a, comments: [...(a.comments || []), newComment] } : a
      ));
    } catch (error) {
      showToast('Erro ao adicionar comentário', 'error');
    }
  }, [setActions, showToast]);

  // 7. BULK CREATE (Smart Paste Import)
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

    try {
      // 1. Carregar tags existentes para evitar duplicatas e minimizar calls
      const existingTags = await dataService.loadTags();
      // Mapa para busca rápida: NAME_UPPER -> Tag
      const tagMap = new Map<string, ActionTag>();
      existingTags.forEach(t => tagMap.set(t.name.toUpperCase(), t));

      // 2. Calcular número inicial
      let nextNum = getNextActionNumber(actionsRef.current, selectedActivity, currentMicroId);

      for (const parsed of parsedActions) {
        try {
          // Cria a ação
          const savedAction = await dataService.createAction({
            microregiaoId: currentMicroId,
            activityId: selectedActivity,
            actionNumber: nextNum,
            title: parsed.title,
          });

          // Incrementa para próxima iteração
          nextNum++;

          // Atualiza com datas e status se fornecidos
          const updates: any = {};
          if (parsed.status !== 'Não Iniciado') updates.status = parsed.status;
          if (parsed.startDate) updates.startDate = parsed.startDate;
          if (parsed.plannedEndDate) updates.plannedEndDate = parsed.plannedEndDate;
          // NOTA: 'parsed.area' agora é convertida em TAGS, não mais em notes.

          if (Object.keys(updates).length > 0) {
            await dataService.updateAction(savedAction.uid, updates);
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
                  tag = await dataService.createTag(areaName);
                  tagMap.set(upperName, tag); // Atualiza cache local
                } catch (e) {
                  console.error(`Erro ao criar tag '${areaName}':`, e);
                  continue; // Pula essa tag se falhar
                }
              }

              // Associa tag à ação
              if (tag) {
                try {
                  await dataService.addTagToAction(savedAction.uid, tag.id);
                  // Verifica duplicidade no array local
                  if (!actionTags.some(t => t.id === tag!.id)) {
                    actionTags.push(tag);
                  }
                } catch (e) {
                  console.error(`Erro ao associar tag '${areaName}' à ação:`, e);
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

          setActions(prev => [...prev, fullAction]);
          successCount++;
        } catch (err) {
          logError('useActionHandlers', 'Erro ao criar ação em lote', err);
          errorCount++;
        }
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
    handleCreateAction,
    handleDeleteAction,
    handleAddRaci,
    handleRemoveRaci,
    handleAddComment,
    handleBulkCreateActions,
  };
}
