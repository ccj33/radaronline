import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';

// Types
import {
  Status,
  RaciRole,
  Action,
  GanttRange,
  TeamMember,
  filterActionsByMicro,
  findActionByUid,
  getNextActionNumber
} from './types';

// Lib
import { formatISODate, parseDateLocal } from './lib/date';
import { clampProgress } from './lib/validation';

// Data
import { INITIAL_DATA } from './data/mockData';
import { MICROREGIOES } from './data/microregioes';

// Services
import * as dataService from './services/dataService';

// Auth
import { AuthProvider, canEditAction, canDeleteAction, canCreateAction, canManageTeam } from './auth';
import { useAuthSafe } from './auth/AuthContext';

// Hooks
import { useResponsive } from './hooks/useMediaQuery';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Common Components
import {
  // ExpandableDescription removido
  ToastProvider,
  useToast,
  ConfirmModal,
  ErrorBoundary,
  Breadcrumb,
  createBreadcrumbItems,
} from './components/common';

// Feature Components
import { TeamView } from './features/team/TeamView';
import { ActivityTabs } from './features/actions/ActivityTabs';
import { Dashboard, OptimizedView } from './features/dashboard';
import { GanttChart } from './features/gantt/GanttChart';
import { ActionTable } from './features/actions/ActionTable';
import { ActionDetailModal } from './features/actions/ActionDetailModal';
import { LoginPage, LgpdConsent } from './features/login';
import { AdminPanel } from './features/admin';
import { UserSettingsModal } from './features/settings/UserSettingsModal';

// =====================================
// COMPONENTE PRINCIPAL DO APP
// =====================================
function AppContent() {
  const { isMobile } = useResponsive();
  const { showToast } = useToast();
  const authContext = useAuthSafe();

  // =====================================
  // ⚠️ REGRAS DE HOOKS: Extrair valores do contexto ANTES de todos os hooks
  // Usando valores padrão seguros quando o contexto não está disponível
  // =====================================
  const user = authContext?.user ?? null;
  const isAdmin = authContext?.isAdmin ?? false;
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const _isLoading = authContext?.isLoading ?? true;
  const currentMicrorregiao = authContext?.currentMicrorregiao ?? null;
  const logout = authContext?.logout ?? (() => { });
  const viewingMicroregiaoId = authContext?.viewingMicroregiaoId ?? null;
  const _isContextLoading = !authContext || authContext.isLoading;

  // --- NAVIGATION STATE ---
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'lgpd'>('main');
  const [didAutoOpenAdmin, setDidAutoOpenAdmin] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<number>(1);
  const [selectedActivity, setSelectedActivity] = useState<string>(INITIAL_DATA.activities[1][0].id);
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'team' | 'optimized'>('table');
  const [ganttRange, setGanttRange] = useState<GanttRange>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile);
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings'>('strategy');
  const [showStickyActivity, setShowStickyActivity] = useState<boolean>(false);
  const activityTabsRef = useRef<HTMLDivElement | null>(null);

  // --- DATA STATE ---
  const [actions, setActions] = useState<Action[]>([]);
  const actionsRef = useRef<Action[]>(actions); // Referência atualizada para callbacks
  const [teamsByMicro, setTeamsByMicro] = useState<Record<string, TeamMember[]>>({});
  const [expandedActionUid, setExpandedActionUid] = useState<string | null>(null);
  const [_isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [_dataError, setDataError] = useState<string | null>(null);

  // Manter ref sincronizada com state
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>("");

  // --- UI STATE ---
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
  const [ganttStatusFilter, setGanttStatusFilter] = useState<Status | 'all'>('all');
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [createActionMicroId, setCreateActionMicroId] = useState<string>('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // --- REFS ---
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // =====================================
  // DERIVADOS DE MICRORREGIÃO
  // =====================================

  // Microrregião atual (para filtrar dados)
  const currentMicroId = useMemo(() => {
    // Se admin está visualizando uma micro específica
    if (viewingMicroregiaoId) return viewingMicroregiaoId;
    // Senão, usa a micro do usuário
    return user?.microregiaoId || '';
  }, [viewingMicroregiaoId, user?.microregiaoId]);

  // Admin está vendo "todas" as microrregiões?
  const isViewingAllMicros = useMemo(() => {
    return isAdmin && !viewingMicroregiaoId;
  }, [isAdmin, viewingMicroregiaoId]);

  // Equipe da microrregião atual
  const allTeams = useMemo(() => Object.values(teamsByMicro).flat(), [teamsByMicro]);

  const currentTeam = useMemo(() => {
    if (isViewingAllMicros) {
      return allTeams;
    }
    return teamsByMicro[currentMicroId] || [];
  }, [currentMicroId, isViewingAllMicros, teamsByMicro, allTeams]);

  // Ações filtradas por microrregião
  const microActions = useMemo(() => {
    if (isViewingAllMicros) {
      return actions;
    }
    return filterActionsByMicro(actions, currentMicroId);
  }, [actions, currentMicroId, isViewingAllMicros]);

  // Ações filtradas para o Gantt
  const ganttActions = useMemo(() => {
    const objectiveActivityIds = INITIAL_DATA.activities[selectedObjective]?.map(a => a.id) || [];
    return microActions
      .filter(a => objectiveActivityIds.includes(a.activityId))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [microActions, selectedObjective]);

  const currentActivity = INITIAL_DATA.activities[selectedObjective]?.find(a => a.id === selectedActivity) || INITIAL_DATA.activities[selectedObjective][0];
  const currentObjective = INITIAL_DATA.objectives.find(o => o.id === selectedObjective);

  // =====================================
  // EFFECTS
  // =====================================

  // ✅ FASE 2: Consolidar useEffects relacionados a autenticação e navegação
  useEffect(() => {
    // Verificar se precisa aceitar LGPD
    if (user && !user.lgpdConsentimento && currentPage !== 'lgpd') {
      setCurrentPage('lgpd');
      return;
    }

    // Administrador entra direto no painel admin após login
    if (isAuthenticated && isAdmin && !didAutoOpenAdmin) {
      setCurrentPage('admin');
      setDidAutoOpenAdmin(true);
      return;
    }

    // Reset flag ao sair
    if (!isAuthenticated && didAutoOpenAdmin) {
      setDidAutoOpenAdmin(false);
    }
  }, [user, currentPage, isAuthenticated, isAdmin, didAutoOpenAdmin]);

  // ✅ FASE 2: Consolidar useEffects relacionados a navegação e view mode
  useEffect(() => {
    // Close sidebar on mobile when navigating
    if (isMobile) {
      setIsSidebarOpen(false);
    }

    // Ao entrar no modo Gantt, usar range "Tudo" por padrão
    if (viewMode === 'gantt') {
      setGanttRange('all');
    }
  }, [viewMode, selectedObjective, isMobile]);

  // ✅ FASE 2: Consolidar useEffects relacionados a sticky activity
  useEffect(() => {
    // Reset quando muda de atividade
    setShowStickyActivity(false);

    // Intersection Observer para mostrar indicador sticky
    const tabsElement = activityTabsRef.current;
    if (!tabsElement || viewMode !== 'table' || currentNav !== 'strategy') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyActivity(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-10px 0px 0px 0px' }
    );

    observer.observe(tabsElement);
    return () => observer.disconnect();
  }, [viewMode, currentNav, selectedActivity]);

  // Quando abrir o modal de criação para admin, pré-seleciona a primeira micro
  useEffect(() => {
    if (isCreateActionModalOpen && !createActionMicroId) {
      setCreateActionMicroId(MICROREGIOES[0]?.id || '');
    }
  }, [isCreateActionModalOpen, createActionMicroId]);

  // Resize observer
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(chartContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [viewMode, isSidebarOpen]);

  // Auto-scroll to expanded action
  useEffect(() => {
    if (viewMode === 'table' && expandedActionUid) {
      const element = document.getElementById(`action-${expandedActionUid}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [viewMode, expandedActionUid]);

  // =====================================
  // CARREGAR DADOS DO SUPABASE
  // =====================================
  useEffect(() => {
    if (!isAuthenticated) {
      setActions([]);
      setTeamsByMicro({});
      setIsDataLoading(false);
      return;
    }

    const loadData = async () => {
      setIsDataLoading(true);
      setDataError(null);

      try {
        // Carregar ações (filtradas por micro se não for admin vendo todas)
        const microId = isViewingAllMicros ? undefined : currentMicroId;
        const [actionsData, teamsData] = await Promise.all([
          dataService.loadActions(microId),
          dataService.loadTeams(microId),
        ]);

        setActions(actionsData);
        setTeamsByMicro(teamsData);
      } catch (error: any) {
        console.error('[App] Erro ao carregar dados:', error);
        setDataError(error.message || 'Erro ao carregar dados');
        // Fallback para dados mock em caso de erro
        setActions(INITIAL_DATA.actions);
        setTeamsByMicro(INITIAL_DATA.teams);
        showToast('Usando dados offline (erro ao conectar)', 'warning');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, currentMicroId, isViewingAllMicros]);

  // =====================================
  // PERMISSION HELPERS
  // =====================================

  // ✅ FASE 3: Otimizar permissions com useMemo (evita recriação de funções)
  const permissions = useMemo(() => {
    const checkCanEdit = (action: Action) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (isViewingAllMicros) return false;
      if (action.microregiaoId !== currentMicroId) return false;
      return canEditAction(user, action);
    };

    const checkCanDelete = (action: Action) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (isViewingAllMicros) return false;
      if (action.microregiaoId !== currentMicroId) return false;
      return canDeleteAction(user, action);
    };

    const checkCanCreate = () => {
      if (!user) return false;
      if (isAdmin) return true;
      if (isViewingAllMicros) return false;
      if (!currentMicroId) return false;
      return canCreateAction(user);
    };

    const checkCanManageTeam = (action: Action) => {
      if (!user) return false;
      if (isAdmin) return true;
      if (isViewingAllMicros) return false;
      if (action.microregiaoId !== currentMicroId) return false;
      return canManageTeam(user, action);
    };

    return { checkCanEdit, checkCanDelete, checkCanCreate, checkCanManageTeam };
  }, [user, isAdmin, isViewingAllMicros, currentMicroId]);

  // Aliases para compatibilidade
  const checkCanEdit = permissions.checkCanEdit;
  const checkCanDelete = permissions.checkCanDelete;
  const checkCanCreate = permissions.checkCanCreate;
  const checkCanManageTeam = permissions.checkCanManageTeam;

  // =====================================
  // ACTION HANDLERS (usam UID)
  // =====================================

  type EditableActionField = 'title' | 'status' | 'startDate' | 'plannedEndDate' | 'endDate' | 'progress' | 'notes';

  const handleUpdateAction = useCallback((uid: string, field: EditableActionField | string, value: string | number) => {
    // Admin pode editar qualquer ação, usuário comum não pode se vendo todas as micros
    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica para editar', 'error');
      return;
    }

    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    // Validação: ação deve pertencer à micro atual (exceto para admin)
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

      // Validar datas
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
  }, [actions, checkCanEdit, showToast, currentMicroId, isViewingAllMicros, isAdmin]);

  const handleSaveAction = useCallback(async (uid?: string) => {
    if (!uid && !expandedActionUid) {
      showToast('Nenhuma ação selecionada', 'error');
      return;
    }

    const actionUid = uid || expandedActionUid!;
    // Usar actionsRef.current para ter a versão mais atualizada (evita closure stale)
    const action = findActionByUid(actionsRef.current, actionUid);

    if (!action) {
      console.error('[App] Ação não encontrada para UID:', actionUid, 'Actions disponíveis:', actionsRef.current.map(a => a.uid));
      showToast('Ação não encontrada', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await dataService.updateAction(actionUid, {
        title: action.title,
        status: action.status,
        startDate: action.startDate,
        plannedEndDate: action.plannedEndDate,
        endDate: action.endDate,
        progress: action.progress,
        notes: action.notes,
      });
      showToast('Ação salva com sucesso!', 'success');
      setExpandedActionUid(null);
    } catch (error: any) {
      console.error('[App] Erro ao salvar ação:', error);
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [expandedActionUid, showToast]);

  const handleCreateAction = useCallback(async () => {
    // Admin visualizando "todas": abre modal para escolher a microrregião da nova ação
    if (isAdmin && isViewingAllMicros) {
      setIsCreateActionModalOpen(true);
      return;
    }

    if (!checkCanCreate()) {
      if (isViewingAllMicros) {
        showToast('Selecione uma microrregião específica para criar ações', 'error');
      } else {
        showToast('Você não tem permissão para criar ações', 'error');
      }
      return;
    }

    if (!currentMicroId || currentMicroId === 'all') {
      showToast('Escolha uma microrregião para criar ações', 'error');
      return;
    }

    try {
      const nextNum = getNextActionNumber(actions, selectedActivity, currentMicroId);
      const newAction = await dataService.createAction({
        microregiaoId: currentMicroId,
        activityId: selectedActivity,
        actionNumber: nextNum,
      });

      setActions(prev => [...prev, newAction]);
      if (viewMode === 'gantt') setViewMode('table');
      setExpandedActionUid(newAction.uid);
      showToast('Nova ação criada!', 'success');
    } catch (error: any) {
      console.error('[App] Erro ao criar ação:', error);
      showToast(`Erro ao criar ação: ${error.message}`, 'error');
    }
  }, [actions, checkCanCreate, currentMicroId, isAdmin, isViewingAllMicros, selectedActivity, viewMode, showToast]);

  const handleConfirmCreateInMicro = useCallback(async () => {
    if (!createActionMicroId) {
      showToast('Selecione uma microrregião', 'error');
      return;
    }

    try {
      const nextNum = getNextActionNumber(actions, selectedActivity, createActionMicroId);
      const newAction = await dataService.createAction({
        microregiaoId: createActionMicroId,
        activityId: selectedActivity,
        actionNumber: nextNum,
      });

      setActions(prev => [...prev, newAction]);
      if (viewMode === 'gantt') setViewMode('table');
      setExpandedActionUid(newAction.uid);
      showToast('Nova ação criada!', 'success');
      setIsCreateActionModalOpen(false);
    } catch (error: any) {
      console.error('[App] Erro ao criar ação:', error);
      showToast(`Erro ao criar ação: ${error.message}`, 'error');
    }
  }, [actions, createActionMicroId, selectedActivity, viewMode, showToast]);

  const handleDeleteAction = useCallback((uid: string) => {
    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica para excluir', 'error');
      return;
    }

    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    // Usuário comum não pode excluir ações de outra micro
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
          await dataService.deleteAction(uid);
          setActions(prev => prev.filter(a => a.uid !== uid));
          setExpandedActionUid(null);
          showToast('Ação excluída!', 'success');
        } catch (error: any) {
          console.error('[App] Erro ao excluir ação:', error);
          showToast(`Erro ao excluir: ${error.message}`, 'error');
        }
      }
    });
  }, [actions, showToast, checkCanDelete, currentMicroId, isViewingAllMicros, isAdmin]);

  const handleAddRaci = useCallback(async (uid: string, memberId: string, role: RaciRole) => {
    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica para gerenciar equipe', 'error');
      return;
    }

    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    // Usuário comum não pode editar ações de outra micro
    if (!isAdmin && action.microregiaoId !== currentMicroId) {
      showToast('Você não pode editar ações de outra microrregião', 'error');
      return;
    }

    if (!checkCanManageTeam(action)) {
      showToast('Você não tem permissão para gerenciar a equipe desta ação', 'error');
      return;
    }

    // Para admin vendo todas as micros, buscar membro em todas as equipes
    const teamToSearch = isAdmin && isViewingAllMicros ? allTeams : currentTeam;
    const member = teamToSearch.find(m => m.id === memberId);
    if (!member) {
      showToast('Membro não encontrado', 'error');
      return;
    }

    // Verificar se já está na RACI
    if (action.raci.some(r => r.name === member.name)) {
      showToast(`${member.name} já está na equipe desta ação`, 'warning');
      return;
    }

    try {
      await dataService.addRaciMember(uid, member.name, role);
      setActions(prev => prev.map(a =>
        a.uid === uid
          ? { ...a, raci: [...a.raci, { name: member.name, role }] }
          : a
      ));
      showToast(`${member.name} adicionado à equipe!`, 'info');
    } catch (error: any) {
      console.error('[App] Erro ao adicionar membro RACI:', error);
      showToast(`Erro ao adicionar membro: ${error.message}`, 'error');
    }
  }, [currentTeam, showToast, actions, checkCanManageTeam, currentMicroId, isViewingAllMicros, isAdmin, allTeams]);

  const handleRemoveRaci = useCallback((uid: string, idx: number, memberName: string) => {
    if (isViewingAllMicros && !isAdmin) {
      showToast('Selecione uma microrregião específica', 'error');
      return;
    }

    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    // Usuário comum não pode editar ações de outra micro
    if (!isAdmin && action.microregiaoId !== currentMicroId) {
      showToast('Você não pode editar ações de outra microrregião', 'error');
      return;
    }

    if (!checkCanManageTeam(action)) {
      showToast('Você não tem permissão para gerenciar a equipe desta ação', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Remover Membro',
      message: `Remover ${memberName} desta ação?`,
      onConfirm: async () => {
        try {
          await dataService.removeRaciMember(uid, memberName);
          setActions(prev => prev.map(a =>
            a.uid === uid
              ? { ...a, raci: a.raci.filter((_, i) => i !== idx) }
              : a
          ));
          showToast('Membro removido!', 'info');
        } catch (error: any) {
          console.error('[App] Erro ao remover membro RACI:', error);
          showToast(`Erro ao remover membro: ${error.message}`, 'error');
        }
      }
    });
  }, [showToast, actions, checkCanManageTeam, currentMicroId, isViewingAllMicros, isAdmin]);

  // Handler para adicionar comentários
  const handleAddComment = useCallback(async (uid: string, content: string) => {
    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    try {
      const newComment = await dataService.addComment(uid, content);
      setActions(prev => prev.map(a =>
        a.uid === uid
          ? { ...a, comments: [...(a.comments || []), newComment] }
          : a
      ));
      showToast('Comentário adicionado!', 'success');
    } catch (error: any) {
      console.error('[App] Erro ao adicionar comentário:', error);
      showToast(`Erro ao adicionar comentário: ${error.message}`, 'error');
    }
  }, [actions, showToast]);

  // =====================================
  // NAVIGATION HANDLERS
  // =====================================

  const handleProfileClick = useCallback(() => {
    if (isAdmin) {
      setCurrentPage('admin');
    } else {
      setIsSettingsModalOpen(true);
    }
  }, [isAdmin]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleGanttActionClick = useCallback((action: Action) => {
    setSelectedActivity(action.activityId);
    setViewMode('table');
    setExpandedActionUid(action.uid);
  }, []);

  const handleNavigateToMain = useCallback(() => {
    setCurrentPage('main');
  }, []);

  // =====================================
  // UI HELPERS
  // =====================================

  const breadcrumbItems = createBreadcrumbItems(
    currentNav,
    currentObjective?.title,
    currentActivity?.id,
    currentActivity?.title,
    () => setCurrentNav('home'),
    () => setViewMode('table'),
  );

  const microregiaoNome = currentMicrorregiao
    ? currentMicrorregiao.nome
    : isViewingAllMicros
      ? 'Todas as microrregiões (somente leitura)'
      : INITIAL_DATA.micro;

  const macrorregiaoNome = currentMicrorregiao
    ? currentMicrorregiao.macrorregiao
    : isViewingAllMicros
      ? ''
      : INITIAL_DATA.macro;

  // =====================================
  // RENDERIZAÇÃO CONDICIONAL
  // =====================================

  // ✅ CORREÇÃO FINAL: Mostrar loading APENAS quando o contexto ainda não está pronto
  // Isso é diferente de "está carregando durante o login"
  if (!authContext) {
    return <LoadingFallback />;
  }

  // ✅ CORREÇÃO: Se não está autenticado, mostra login (independente de isLoading)
  // O LoginPage tem seu próprio estado de loading interno
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user && !user.lgpdConsentimento) {
    return <LgpdConsent onAccepted={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <AdminPanel
        onBack={handleNavigateToMain}
        actions={actions}
        teams={INITIAL_DATA.teams}
      />
    );
  }

  // =====================================
  // RENDER PRINCIPAL
  // =====================================
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Global Styles */}
      <style>{`
        .pattern-diagonal-lines {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(251, 146, 60, 0.2) 5px, rgba(251, 146, 60, 0.2) 10px);
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; border: 2px solid transparent; background-clip: content-box; }
        ::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        :focus-visible { outline: 2px solid #0891b2; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
        @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse-soft { animation: pulse-soft 2s infinite; }
      `}</style>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Excluir"
        type="danger"
      />

      {/* Modal para admin criar ação escolhendo microrregião */}
      {isAdmin && isCreateActionModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsCreateActionModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Criar ação</h3>
                <p className="text-sm text-slate-600">
                  Escolha a microrregião onde a nova ação será criada.
                </p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setIsCreateActionModalOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Microrregião
              </label>
              <select
                value={createActionMicroId}
                onChange={e => setCreateActionMicroId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {MICROREGIOES.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg border border-slate-200"
                onClick={() => setIsCreateActionModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
                onClick={handleConfirmCreateInMicro}
              >
                Criar ação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip to main content - Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Ir para conteúdo principal
      </a>

      {/* Aviso de modo somente leitura (só para não-admin) */}
      {isViewingAllMicros && !isAdmin && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          📋 Visualizando todas as microrregiões (somente leitura)
        </div>
      )}

      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentNav={currentNav}
        setCurrentNav={setCurrentNav}
        selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective}
        setSelectedActivity={setSelectedActivity}
        setViewMode={setViewMode}
        objectives={INITIAL_DATA.objectives}
        activities={INITIAL_DATA.activities}
        onProfileClick={handleProfileClick}
        isMobile={isMobile}
        userName={user?.nome}
        userRole={user?.role}
        userAvatarId={user?.avatarId}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onOpenSettings={handleOpenSettings}
      />

      {/* USER SETTINGS MODAL */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* MAIN CONTENT */}
      <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative overflow-hidden" role="main">
        {/* HEADER */}
        <Header
          macro={macrorregiaoNome}
          micro={microregiaoNome}
          currentNav={currentNav}
          selectedObjective={selectedObjective}
          objectives={INITIAL_DATA.objectives}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onMenuClick={() => setIsSidebarOpen(true)}
          isMobile={isMobile}
          isAdmin={isAdmin}
          userRole={user?.role}
          onAdminClick={() => setCurrentPage('admin')}
        />

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">

          {/* Breadcrumb */}
          {/* Breadcrumb removido por redundância e estética */}

          {/* Indicador sticky removido - substituído por ActivityTabs fixed */}

          {/* ACTIVITY TABS */}
          {currentNav === 'strategy' && viewMode === 'table' && (
            <div ref={activityTabsRef}>
              <ActivityTabs
                activities={INITIAL_DATA.activities[selectedObjective] || []}
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
              />
            </div>
          )}

          <div className="p-4 sm:p-6" ref={chartContainerRef}>

            {/* --- DASHBOARD VIEW --- */}
            {currentNav === 'home' ? (
              <ErrorBoundary>
                <Dashboard
                  actions={microActions}
                  team={currentTeam}
                  objectives={INITIAL_DATA.objectives}
                  activities={INITIAL_DATA.activities}
                />
              </ErrorBoundary>

              /* --- GANTT VIEW --- */
            ) : viewMode === 'gantt' && currentNav === 'strategy' ? (
              <ErrorBoundary>
                <GanttChart
                  actions={ganttActions}
                  ganttRange={ganttRange}
                  setGanttRange={setGanttRange}
                  containerWidth={containerWidth}
                  statusFilter={ganttStatusFilter}
                  setStatusFilter={setGanttStatusFilter}
                  onActionClick={handleGanttActionClick}
                  showToast={showToast}
                  isMobile={isMobile}
                />
              </ErrorBoundary>

            ) : viewMode === 'team' ? (
              <ErrorBoundary>
                <TeamView
                  team={currentTeam}
                  microId={currentMicroId}
                  onUpdateTeam={(microId, updatedTeam) => {
                    if (!microId) return;
                    setTeamsByMicro(prev => ({ ...prev, [microId]: updatedTeam }));
                  }}
                  onAddMember={async (member) => {
                    try {
                      const newMember = await dataService.addTeamMember({
                        microregiaoId: member.microregiaoId,
                        name: member.name,
                        role: member.role,
                        email: member.email,
                        municipio: member.municipio,
                      });
                      // Atualiza estado local IMEDIATAMENTE após sucesso
                      setTeamsByMicro(prev => ({
                        ...prev,
                        [member.microregiaoId]: [...(prev[member.microregiaoId] || []), newMember]
                      }));
                      showToast(`${member.name} adicionado à equipe!`, 'success');
                      return newMember;
                    } catch (error: any) {
                      console.error('[App] Erro ao adicionar membro:', error);
                      showToast(`Erro ao adicionar membro: ${error.message}`, 'error');
                      return null;
                    }
                  }}
                  onRemoveMember={async (memberId) => {
                    try {
                      await dataService.removeTeamMember(String(memberId));
                      // Atualiza estado local IMEDIATAMENTE após sucesso
                      setTeamsByMicro(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(microId => {
                          updated[microId] = updated[microId].filter(m => m.id !== memberId);
                        });
                        return updated;
                      });
                      showToast('Membro removido da equipe!', 'success');
                      return true;
                    } catch (error: any) {
                      console.error('[App] Erro ao remover membro:', error);
                      showToast(`Erro ao remover membro: ${error.message}`, 'error');
                      return false;
                    }
                  }}
                  readOnly={isViewingAllMicros && !isAdmin}
                />
              </ErrorBoundary>

            ) : viewMode === 'optimized' ? (
              /* --- OPTIMIZED VIEW --- */
              <ErrorBoundary>
                <OptimizedView
                  objectives={INITIAL_DATA.objectives}
                  activities={INITIAL_DATA.activities}
                  actions={microActions}
                  team={currentTeam}
                  onUpdateAction={(uid, updates) => {
                    // Adaptar para a assinatura existente
                    Object.entries(updates).forEach(([field, value]) => {
                      if (value !== undefined) {
                        handleUpdateAction(uid, field, value as string | number);
                      }
                    });
                  }}
                  onDeleteAction={handleDeleteAction}
                  onAddRaci={handleAddRaci}
                  onRemoveRaci={handleRemoveRaci}
                  onAddComment={handleAddComment}
                  readOnly={isViewingAllMicros && !isAdmin}
                />
              </ErrorBoundary>

            ) : (
              /* --- TABLE VIEW --- */
              <ErrorBoundary>
                <div className="max-w-5xl mx-auto">
                  {/* Descrição movida para ActivityTabs */}

                  <ActionTable
                    actions={microActions}
                    selectedActivity={selectedActivity}
                    team={currentTeam}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    responsibleFilter={responsibleFilter}
                    setResponsibleFilter={setResponsibleFilter}
                    expandedActionId={expandedActionUid}
                    setExpandedActionId={setExpandedActionUid}
                    onUpdateAction={handleUpdateAction}
                    onSaveAction={handleSaveAction}
                    onCreateAction={handleCreateAction}
                    onDeleteAction={handleDeleteAction}
                    onAddRaci={handleAddRaci}
                    onRemoveRaci={handleRemoveRaci}
                    onAddComment={handleAddComment}
                    isSaving={isSaving}
                    canCreate={checkCanCreate()}
                    canEdit={checkCanEdit}
                    canDelete={checkCanDelete}
                    readOnly={isViewingAllMicros && !isAdmin}
                  />
                </div>
              </ErrorBoundary>
            )}
          </div>
        </div>
      </main>

      {/* ACTION DETAIL MODAL (Drawer) */}
      {(() => {
        const selectedAction = expandedActionUid
          ? microActions.find(a => a.uid === expandedActionUid)
          : null;

        return (
          <ActionDetailModal
            isOpen={!!selectedAction}
            action={selectedAction || null}
            team={currentTeam}
            activityName={currentActivity?.title || 'Atividade'}
            onClose={() => setExpandedActionUid(null)}
            onUpdateAction={handleUpdateAction}
            onSaveAction={handleSaveAction}
            onDeleteAction={handleDeleteAction}
            onAddRaci={handleAddRaci}
            onRemoveRaci={handleRemoveRaci}
            onAddComment={handleAddComment}
            isSaving={isSaving}
            canEdit={selectedAction ? checkCanEdit(selectedAction) : false}
            canDelete={selectedAction ? checkCanDelete(selectedAction) : false}
            readOnly={isViewingAllMicros && !isAdmin}
          />
        );
      })()}
    </div>
  );
}

// =====================================
// LOADING FALLBACK COMPONENT
// =====================================
// ✅ CORREÇÃO: LoadingFallback com botão de escape para evitar loading infinito
function LoadingFallback() {
  const [showRetry, setShowRetry] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    // Mostrar botão de retry após 5 segundos
    const retryTimer = setTimeout(() => setShowRetry(true), 5000);
    // Mostrar botão de logout após 10 segundos
    const logoutTimer = setTimeout(() => setShowLogout(true), 10000);

    return () => {
      clearTimeout(retryTimer);
      clearTimeout(logoutTimer);
    };
  }, []);

  const handleLogout = () => {
    // Limpa localStorage do Supabase e recarrega
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Erro ao limpar sessão:', e);
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 mb-4">Carregando...</p>

        {showRetry && !showLogout && (
          <p className="text-xs text-slate-400 mb-3">Está demorando mais que o esperado...</p>
        )}

        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Tentar Novamente
          </button>
        )}

        {showLogout && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-2">Problemas com a sessão?</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
            >
              Fazer Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================
// APP WRAPPER COM PROVIDERS
// =====================================
export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-md p-8">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                Erro na Autenticação
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Ocorreu um erro ao inicializar a autenticação. Por favor, recarregue a página.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        }
      >
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
