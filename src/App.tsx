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
import { log, logError } from './lib/logger';

// Data - Apenas constantes de configuração, sem mocks
import { MICROREGIOES } from './data/microregioes';

// Services - Fonte única de dados
import * as dataService from './services/dataService';
import * as authService from './services/authService';

// Auth
import { AuthProvider, canEditAction, canDeleteAction, canCreateAction, canManageTeam } from './auth';
import { useAuthSafe } from './auth/AuthContext';

// Hooks
import { useResponsive } from './hooks/useMediaQuery';
import { AnalyticsProvider } from './hooks/useAnalytics';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Mobile Components
import { MobileBottomNav, MobileFab } from './components/mobile';

// Onboarding
import { OnboardingTour } from './components/onboarding';

// Common Components
import {
  // ExpandableDescription removido
  ToastProvider,
  useToast,
  ConfirmModal,
  EditNameModal, // Added import
  ErrorBoundary,
} from './components/common';

// Feature Components
import { TeamView } from './features/team/TeamView';
import { ActivityTabs } from './features/actions/ActivityTabs';
import { Dashboard, OptimizedView } from './features/dashboard';
import { GanttChart } from './features/gantt/GanttChart';
import { ActionTable } from './features/actions/ActionTable';
import { ActionDetailModal } from './features/actions/ActionDetailModal';
import { LoginPage, LgpdConsent, LandingOnboarding } from './features/login';
import { AdminPanel } from './features/admin';
import { LinearCalendar } from './features/admin/dashboard/LinearCalendar';
import { UserSettingsModal } from './features/settings/UserSettingsModal';
import { MunicipalityOnboardingModal } from './components/auth/MunicipalityOnboardingModal';

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
  const currentMicrorregiao = authContext?.currentMicrorregiao ?? null;
  const logout = useMemo(() => authContext?.logout ?? (() => { }), [authContext?.logout]);
  const viewingMicroregiaoId = authContext?.viewingMicroregiaoId ?? null;
  // ✅ isContextLoading removido - _isLoading já cobre o caso de contexto null

  // --- NAVIGATION STATE ---
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'lgpd'>('main');
  const [didAutoOpenAdmin, setDidAutoOpenAdmin] = useState(false);
  const [hasViewedLanding, setHasViewedLanding] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<number>(1);
  const [selectedActivity, setSelectedActivity] = useState<string>('1.1'); // Default inicial
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'team' | 'optimized' | 'calendar'>('table');
  const [ganttRange, setGanttRange] = useState<GanttRange>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile);
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings'>('strategy');
  // NOTA: showStickyActivity calculado mas não consumido na UI atual - mantido para uso futuro
  const [, setShowStickyActivity] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState(false); // New lifted state
  const activityTabsRef = useRef<HTMLDivElement | null>(null);

  // --- DATA STATE ---
  const [actions, setActions] = useState<Action[]>([]);
  const actionsRef = useRef<Action[]>(actions); // Referência atualizada para callbacks
  const [teamsByMicro, setTeamsByMicro] = useState<Record<string, TeamMember[]>>({});
  const [expandedActionUid, setExpandedActionUid] = useState<string | null>(null);
  const [, setIsDataLoading] = useState<boolean>(true);
  const [, setDataError] = useState<string | null>(null);

  // --- OBJECTIVES & ACTIVITIES STATE (carregados do banco) ---
  const [objectives, setObjectives] = useState<{ id: number; title: string; status: 'on-track' | 'delayed' }[]>([]);
  const [activities, setActivities] = useState<Record<number, { id: string; title: string; description: string }[]>>({});

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
  const [allowAvatarChange, setAllowAvatarChange] = useState(false);
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);

  // --- ONBOARDING STATE ---
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [pendingOnboarding, setPendingOnboarding] = useState<boolean>(false);

  // Check if user should see onboarding (first time using Radar)
  // Only show after municipality modal is closed (firstAccess completed)
  useEffect(() => {
    if (!(isAuthenticated && user && !isAdmin)) return;

    const onboardingKey = `radar_onboarding_completed_${user.id}`;
    const hasCompletedOnboarding = localStorage.getItem(onboardingKey);

    // If user still needs to complete first access (password/municipality), mark as pending
    if (user.firstAccess) {
      if (!hasCompletedOnboarding) {
        setPendingOnboarding(true);
      }
      return; // Don't show onboarding yet
    }

    // User has completed first access, check if we should show onboarding
    if (!hasCompletedOnboarding || pendingOnboarding) {
      // Small delay to let the app render first
      const timerId = window.setTimeout(() => {
        setShowOnboarding(true);
        setPendingOnboarding(false);
      }, 800);

      // Cleanup: limpar timer se componente desmontar ou deps mudarem
      return () => window.clearTimeout(timerId);
    }
  }, [isAuthenticated, user, isAdmin, pendingOnboarding]);

  const handleOnboardingComplete = useCallback(() => {
    if (user) {
      localStorage.setItem(`radar_onboarding_completed_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  }, [user]);

  const handleOnboardingSkip = useCallback(() => {
    if (user) {
      localStorage.setItem(`radar_onboarding_completed_${user.id}`, 'true');
    }
    setShowOnboarding(false);
  }, [user]);

  // Centralized Edit Modal State
  const [editModalConfig, setEditModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string;
    inputType: 'text' | 'textarea';
    label: string;
    onSave: (value: string) => void;
  }>({
    isOpen: false,
    title: '',
    initialValue: '',
    inputType: 'text',
    label: '',
    onSave: () => { },
  });
  const [pendingNewActionUid, setPendingNewActionUid] = useState<string | null>(null); // Track unsaved new actions

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

  // Usuário está vendo "todas" as microrregiões? (somente admin pode, mas a lógica de readOnly usa isso)
  // NOTA: Apenas admins podem realmente estar nesse estado, mas separamos a verificação
  // para que `readOnly = isViewingAllMicros && !isAdmin` funcione corretamente se futuramente
  // outros perfis puderem ver todas as micros em modo leitura.
  const isViewingAllMicros = useMemo(() => {
    // Admin vendo todas = sem micro selecionada e sem micro própria
    // Usuário comum nunca deve estar nesse estado, mas se estiver, será readOnly
    if (isAdmin && !viewingMicroregiaoId) return true;
    // Fallback: usuário sem micro definida (não deveria acontecer, mas protege)
    if (!isAdmin && !viewingMicroregiaoId && !user?.microregiaoId) return true;
    return false;
  }, [isAdmin, viewingMicroregiaoId, user?.microregiaoId]);

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
    const objectiveActivityIds = activities[selectedObjective]?.map(a => a.id) || [];
    return microActions
      .filter(a => objectiveActivityIds.includes(a.activityId))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [microActions, selectedObjective, activities]);

  const currentActivity = activities[selectedObjective]?.find(a => a.id === selectedActivity) || activities[selectedObjective]?.[0];
  const currentObjective = objectives.find(o => o.id === selectedObjective);

  // =====================================
  // EFFECTS
  // =====================================

  // ✅ FASE 2: Consolidar useEffects relacionados a autenticação e navegação
  useEffect(() => {
    // NOTA: A lógica de LGPD é tratada diretamente no render condicional,
    // não precisamos setar currentPage para 'lgpd'

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
  }, [isAuthenticated, isAdmin, didAutoOpenAdmin]);

  // Check for first-time access onboarding (municipality + password)
  useEffect(() => {
    // Apenas usuários não-admin com firstAccess = true precisam completar onboarding
    if (isAuthenticated && user && !isAdmin && user.firstAccess) {
      setShowMunicipalityModal(true);
    }
  }, [isAuthenticated, isAdmin, user?.firstAccess]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Nota: Admins podem editar objetivos/atividades mesmo quando visualizam uma microrregião específica
    // O modo de edição não é mais desativado automaticamente ao selecionar uma microrregião
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
  }, [viewMode, currentNav, selectedActivity]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setObjectives([]);
      setActivities({});
      setIsDataLoading(false);
      return;
    }

    const loadData = async () => {
      setIsDataLoading(true);
      setDataError(null);

      try {
        // Carregar ações (filtradas por micro se não for admin vendo todas)
        const microId = isViewingAllMicros ? undefined : currentMicroId;

        // Carregar todos os dados em paralelo
        // IMPORTANTE: Objetivos e Atividades são SEPARADOS por microrregião!
        const [actionsData, teamsData, objectivesData, activitiesData] = await Promise.all([
          dataService.loadActions(microId),
          dataService.loadTeams(microId),
          dataService.loadObjectives(microId),
          dataService.loadActivities(microId),
        ]);

        setActions(actionsData);
        setTeamsByMicro(teamsData);
        setObjectives(objectivesData);
        setActivities(activitiesData);

        // Corrigir seleção usando variáveis locais para evitar estado stale
        if (objectivesData.length > 0) {
          // Determinar próximo objetivo selecionado baseado nos dados recém-carregados
          const nextObjectiveId = objectivesData.some(o => o.id === selectedObjective)
            ? selectedObjective
            : objectivesData[0].id;

          // Atualizar objetivo se mudou
          if (nextObjectiveId !== selectedObjective) {
            setSelectedObjective(nextObjectiveId);
          }

          // Usar nextObjectiveId (variável local) para buscar atividades, não selectedObjective (state)
          const nextObjectiveActivities = activitiesData[nextObjectiveId] || [];
          
          // Determinar próxima atividade selecionada
          if (nextObjectiveActivities.length > 0) {
            const activityStillExists = nextObjectiveActivities.some(a => a.id === selectedActivity);
            if (!activityStillExists) {
              setSelectedActivity(nextObjectiveActivities[0].id);
            }
          }
        }
      } catch (error: any) {
        logError('App', 'Erro ao carregar dados', error);
        setDataError(error.message || 'Erro ao carregar dados');
        showToast('Erro ao carregar dados do servidor. Verifique sua conexão.', 'error');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentMicroId, isViewingAllMicros]); // showToast é estável, não precisa ser dependência

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

    // Usar actionsRef.current para evitar closure stale em updates rápidos
    const action = findActionByUid(actionsRef.current, uid);
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
  }, [checkCanEdit, showToast, currentMicroId, isViewingAllMicros, isAdmin]);

  const handleSaveAction = useCallback(async (uid?: string) => {
    if (!uid && !expandedActionUid) {
      showToast('Nenhuma ação selecionada', 'error');
      return;
    }

    const actionUid = uid || expandedActionUid!;
    // Usar actionsRef.current para ter a versão mais atualizada (evita closure stale)
    const action = findActionByUid(actionsRef.current, actionUid);

    if (!action) {
      logError('App', 'Ação não encontrada para UID', { actionUid, availableActions: actionsRef.current.map(a => a.uid) });
      showToast('Ação não encontrada', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Verificar se é uma ação nova (ainda não salva no banco)
      const isNewAction = pendingNewActionUid === actionUid;

      if (isNewAction) {
        // Criar a ação no banco
        const parts = action.id.split('.');
        const actionNumber = parseInt(parts[parts.length - 1], 10);

        const savedAction = await dataService.createAction({
          microregiaoId: action.microregiaoId,
          activityId: action.activityId,
          actionNumber,
          title: action.title,
        });

        // Atualizar os outros campos se foram preenchidos
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

        // Atualizar o UID na lista local (pode ter mudado)
        setActions(prev => prev.map(a =>
          a.uid === actionUid ? { ...savedAction, ...action, uid: savedAction.uid } : a
        ));

        setPendingNewActionUid(null);
        showToast('Ação criada com sucesso!', 'success');
      } else {
        // Ação existente - apenas atualizar
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
      }

      setExpandedActionUid(null);
    } catch (error: any) {
      logError('App', 'Erro ao salvar ação', error);
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [expandedActionUid, pendingNewActionUid, showToast]);

  // Handler para fechar o modal de ação - remove ação pendente se não foi salva
  const handleCloseActionModal = useCallback(() => {
    if (pendingNewActionUid && expandedActionUid === pendingNewActionUid) {
      // Remover a ação temporária que não foi salva
      setActions(prev => prev.filter(a => a.uid !== pendingNewActionUid));
      setPendingNewActionUid(null);
      showToast('Ação descartada', 'info');
    }
    setExpandedActionUid(null);
  }, [pendingNewActionUid, expandedActionUid, showToast]);

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

    // Criar ação temporária local (não salva no banco ainda)
    const nextNum = getNextActionNumber(actions, selectedActivity, currentMicroId);
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
    };

    setActions(prev => [...prev, tempAction]);
    setPendingNewActionUid(tempUid); // Mark as unsaved
    if (viewMode === 'gantt') setViewMode('table');
    setExpandedActionUid(tempUid);
    showToast('Preencha os dados e clique em Salvar', 'info');
  }, [actions, checkCanCreate, currentMicroId, isAdmin, isViewingAllMicros, selectedActivity, viewMode, showToast]);

  const handleConfirmCreateInMicro = useCallback(() => {
    if (!createActionMicroId) {
      showToast('Selecione uma microrregião', 'error');
      return;
    }

    // Criar ação temporária local (não salva no banco ainda)
    const nextNum = getNextActionNumber(actions, selectedActivity, createActionMicroId);
    const actionId = `${selectedActivity}.${nextNum}`;
    const tempUid = `${createActionMicroId}::${actionId}`;

    const tempAction: Action = {
      uid: tempUid,
      id: actionId,
      activityId: selectedActivity,
      microregiaoId: createActionMicroId,
      title: 'Nova Ação',
      status: 'Não Iniciado',
      startDate: '',
      plannedEndDate: '',
      endDate: '',
      progress: 0,
      raci: [],
      notes: '',
      comments: [],
    };

    setActions(prev => [...prev, tempAction]);
    setPendingNewActionUid(tempUid);
    if (viewMode === 'gantt') setViewMode('table');
    setExpandedActionUid(tempUid);
    showToast('Preencha os dados e clique em Salvar', 'info');
    setIsCreateActionModalOpen(false);
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
          // Fechar o modal de confirmação imediatamente para evitar ficar aberto durante a operação
          setConfirmModal(prev => ({ ...prev, isOpen: false }));

          await dataService.deleteAction(uid);
          setActions(prev => prev.filter(a => a.uid !== uid));
          setExpandedActionUid(null);
          showToast('Ação excluída!', 'success');
        } catch (error: any) {
          logError('App', 'Erro ao excluir ação', error);
          // Garantir que o modal de confirmação seja fechado em caso de erro também
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
      showToast(`${member.name} adicionado à equipe!`, 'info');
    } catch (error: any) {
      // Se o erro for "Ação não encontrada", significa que é uma ação nova não salva
      // Nesse caso, permitimos adicionar ao estado local (draft)
      const isNewActionError = error.message?.includes('Ação não encontrada') || error.message?.includes('row not found');

      if (isNewActionError) {
        log('App', 'Adicionando membro a ação não salva (local state only)');
      } else {
        logError('App', 'Erro ao adicionar membro RACI', error);
        showToast(`Erro ao adicionar membro: ${error.message}`, 'error');
        // Se for erro real (network, etc) que não seja "não encontrado", aborta update local
        return;
      }
    }

    // Update local state (Optimistic or Draft)
    setActions(prev => prev.map(a =>
      a.uid === uid
        ? { ...a, raci: [...a.raci, { name: member.name, role }] }
        : a
    ));
  }, [currentTeam, showToast, actions, checkCanManageTeam, currentMicroId, isViewingAllMicros, isAdmin, allTeams]);

  const handleRemoveRaci = useCallback((uid: string, _idx: number, memberName: string) => {
    // NOTA: _idx não é mais usado - removemos pelo nome para evitar inconsistências
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
          showToast(`${memberName} removido da equipe.`, 'info');
        } catch (error: any) {
          const isNewActionError = error.message?.includes('Ação não encontrada') || error.message?.includes('row not found');
          if (isNewActionError) {
            log('App', 'Removendo membro de ação não salva (local state only)');
          } else {
            logError('App', 'Erro ao remover membro RACI', error);
            showToast(`Erro ao remover: ${error.message}`, 'error');
            return;
          }
        }

        // ✅ CORREÇÃO: Remover pelo NOME, não pelo índice, para evitar inconsistências
        setActions(prev => prev.map(a =>
          a.uid === uid
            ? { ...a, raci: a.raci.filter(r => r.name !== memberName) }
            : a
        ));
      }
    });
  }, [showToast, actions, checkCanManageTeam, currentMicroId, isViewingAllMicros, isAdmin]);

  // Handler para adicionar comentários (com suporte a threads)
  const handleAddComment = useCallback(async (uid: string, content: string, parentId?: string | null) => {
    const action = findActionByUid(actions, uid);
    if (!action) {
      showToast('Ação não encontrada', 'error');
      return;
    }

    try {
      const newComment = await dataService.addComment(uid, content, parentId);
      setActions(prev => prev.map(a =>
        a.uid === uid
          ? { ...a, comments: [...(a.comments || []), newComment] }
          : a
      ));
      showToast('Comentário adicionado!', 'success');

      // Processar menções e criar notificações (assíncrono, não bloqueia)
      dataService.processMentions(content, action.title, newComment.authorName);
    } catch (error: any) {
      logError('App', 'Erro ao adicionar comentário', error);
      showToast(`Erro ao adicionar comentário: ${error.message}`, 'error');
    }
  }, [actions, showToast]);

  const handleEditComment = useCallback(async (actionUid: string, commentId: string, content: string) => {
    try {
      await dataService.updateComment(commentId, content);
      setActions(prev => prev.map(a =>
        a.uid === actionUid
          ? { ...a, comments: a.comments?.map(c => c.id === commentId ? { ...c, content } : c) }
          : a
      ));
      showToast('Comentário atualizado!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao editar comentário', error);
      showToast(`Erro ao editar comentário: ${error.message}`, 'error');
    }
  }, [showToast]);

  const handleDeleteComment = useCallback(async (actionUid: string, commentId: string) => {
    try {
      await dataService.deleteComment(commentId);
      setActions(prev => prev.map(a =>
        a.uid === actionUid
          ? {
            ...a,
            comments: a.comments?.filter(c => c.id !== commentId && c.parentId !== commentId)
          }
          : a
      ));
      showToast('Comentário excluído!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao excluir comentário', error);
      showToast(`Erro ao excluir comentário: ${error.message}`, 'error');
    }
  }, [showToast]);

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

  const handleOpenSettings = useCallback((mode: 'settings' | 'avatar' = 'settings') => {
    setAllowAvatarChange(mode === 'avatar');
    setIsSettingsModalOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleGanttActionClick = useCallback((action: Action) => {
    setSelectedActivity(action.activityId);
    // setViewMode('table'); // Removido para manter no Gantt
    setExpandedActionUid(action.uid);
  }, []);

  const handleNavigateToMain = useCallback(() => {
    setCurrentPage('main');
  }, []);

  // Handler para navegação do Dashboard
  const handleDashboardNavigate = useCallback((view: 'list', filters?: { status?: string; objectiveId?: number }) => {
    setCurrentNav('strategy');
    setViewMode('table');
    if (filters?.status) {
      // Cast to match the expected specific string literals
      setStatusFilter(filters.status as any);
    }
    if (filters?.objectiveId) {
      setSelectedObjective(filters.objectiveId);
    }
  }, []);

  // =====================================
  // OBJECTIVES & ACTIVITIES CRUD HANDLERS
  // (Admin/SuperAdmin only)
  // =====================================

  const handleAddObjective = useCallback(async () => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem adicionar objetivos', 'error');
      return;
    }

    // Determinar a microrregião para o objetivo
    const targetMicroId = currentMicroId || user?.microregiaoId || 'all';
    if (!targetMicroId || targetMicroId === 'all') {
      showToast('Selecione uma microrregião específica para criar o objetivo', 'error');
      return;
    }

    try {
      // Usar a posição sequencial (quantidade de objetivos + 1), não o ID do banco
      const nextDisplayNumber = objectives.length + 1;
      const newTitle = `${nextDisplayNumber}. Novo Objetivo`;

      // Salvar no banco
      const newObjective = await dataService.createObjective(newTitle, targetMicroId);

      setObjectives(prev => [...prev, newObjective]);
      setActivities(prev => ({
        ...prev,
        [newObjective.id]: [], // Iniciar sem atividades
      }));
      showToast('Objetivo adicionado! Edite o título conforme necessário.', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao criar objetivo', error);
      showToast(`Erro ao criar objetivo: ${error.message}`, 'error');
    }
  }, [objectives, user?.role, user?.microregiaoId, currentMicroId, showToast]);

  const handleDeleteObjective = useCallback(async (id: number) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem excluir objetivos', 'error');
      return;
    }

    // Verificar se há ações associadas a este objetivo
    const objectiveActivities = activities[id] || [];
    const relatedActions = actions.filter(a =>
      objectiveActivities.some(act => act.id === a.activityId)
    );

    if (relatedActions.length > 0) {
      showToast(`Não é possível excluir: existem ${relatedActions.length} ações vinculadas a este objetivo`, 'error');
      return;
    }

    try {
      // Excluir do banco
      await dataService.deleteObjective(id);

      setObjectives(prev => prev.filter(o => o.id !== id));
      setActivities(prev => {
        const newActivities = { ...prev };
        delete newActivities[id];
        return newActivities;
      });

      // Se o objetivo excluído estava selecionado, selecionar o primeiro
      if (selectedObjective === id) {
        const remaining = objectives.filter(o => o.id !== id);
        if (remaining.length > 0) {
          setSelectedObjective(remaining[0].id);
          const firstActivity = activities[remaining[0].id]?.[0];
          if (firstActivity) {
            setSelectedActivity(firstActivity.id);
          }
        }
      }

      showToast('Objetivo excluído!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao excluir objetivo', error);
      showToast(`Erro ao excluir objetivo: ${error.message}`, 'error');
    }
  }, [user?.role, activities, actions, objectives, selectedObjective, showToast]);

  const handleAddActivity = useCallback(async (objectiveId: number) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem adicionar atividades', 'error');
      return;
    }

    // Determinar microregião correta para criar a atividade
    const targetMicroId = currentMicroId && currentMicroId !== 'all' ? currentMicroId : user?.microregiaoId || '';

    if (!targetMicroId) {
      showToast('Selecione uma microrregião para criar atividades', 'error');
      return;
    }

    const currentActivities = activities[objectiveId] || [];

    // Calcular a posição sequencial do objetivo (1, 2, 3...) baseado na lista de objetivos
    const objectiveIndex = objectives.findIndex(o => o.id === objectiveId);
    const objectiveDisplayNumber = objectiveIndex >= 0 ? objectiveIndex + 1 : objectiveId;

    // Extrair números das atividades existentes (considerando formato "MicroId_Obj.X" ou "Obj.X")
    const activityNumbers = currentActivities.map(a => {
      const id = a.id;
      // Formato novo: "MR070_1.1" -> extrair "1" (último número após o ponto)
      // Formato antigo: "1.1" -> extrair "1"
      const parts = id.split('.');
      const lastPart = parts[parts.length - 1];
      // Remover qualquer sufixo não numérico (ex: "1abc123" -> 1)
      const num = parseInt(lastPart, 10);
      return isNaN(num) ? 0 : num;
    });

    const nextNum = activityNumbers.length > 0 ? Math.max(...activityNumbers) + 1 : 1;

    // Formato do ID: "MicroId_Objetivo.Sequencial" (ex: "MR070_1.1")
    // Usa a posição sequencial do objetivo, não o ID do banco
    const newActivityId = `${targetMicroId}_${objectiveDisplayNumber}.${nextNum}`;
    const newTitle = `Nova Atividade ${nextNum}`;
    const newDescription = 'Descrição da nova atividade.';

    try {
      // Salvar no banco
      const newActivity = await dataService.createActivity(objectiveId, newActivityId, newTitle, targetMicroId, newDescription);

      setActivities(prev => ({
        ...prev,
        [objectiveId]: [...(prev[objectiveId] || []), newActivity],
      }));

      showToast('Atividade adicionada!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao criar atividade', error);
      showToast(`Erro ao criar atividade: ${error.message}`, 'error');
    }
  }, [user?.role, user?.microregiaoId, currentMicroId, activities, showToast]);

  const handleDeleteActivity = useCallback(async (objectiveId: number, activityId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem excluir atividades', 'error');
      return;
    }

    // Verificar se há ações associadas a esta atividade
    const relatedActions = actions.filter(a => a.activityId === activityId);
    if (relatedActions.length > 0) {
      showToast(`Não é possível excluir: existem ${relatedActions.length} ações vinculadas a esta atividade`, 'error');
      return;
    }

    try {
      // Excluir do banco
      await dataService.deleteActivity(activityId);

      setActivities(prev => ({
        ...prev,
        [objectiveId]: (prev[objectiveId] || []).filter(a => a.id !== activityId),
      }));

      // Se a atividade excluída estava selecionada, selecionar a primeira
      if (selectedActivity === activityId) {
        const remaining = (activities[objectiveId] || []).filter(a => a.id !== activityId);
        if (remaining.length > 0) {
          setSelectedActivity(remaining[0].id);
        }
      }

      showToast('Atividade excluída!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao excluir atividade', error);
      showToast(`Erro ao excluir atividade: ${error.message}`, 'error');
    }
  }, [user?.role, actions, activities, selectedActivity, showToast]);

  const handleUpdateObjective = useCallback(async (id: number, newTitle: string) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem editar objetivos', 'error');
      return;
    }

    try {
      // Salvar no banco
      await dataService.updateObjective(id, { title: newTitle });

      setObjectives(prev => prev.map(o => o.id === id ? { ...o, title: newTitle } : o));
      showToast('Objetivo atualizado!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao atualizar objetivo', error);
      showToast(`Erro ao atualizar objetivo: ${error.message}`, 'error');
    }
  }, [user?.role, showToast]);

  const handleUpdateActivity = useCallback(async (objectiveId: number, activityId: string, field: 'title' | 'description', value: string) => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      showToast('Apenas administradores podem editar atividades', 'error');
      return;
    }

    try {
      // Salvar no banco
      await dataService.updateActivity(activityId, { [field]: value });

      setActivities(prev => ({
        ...prev,
        [objectiveId]: prev[objectiveId]?.map(a => a.id === activityId ? { ...a, [field]: value } : a) || []
      }));
      showToast('Atividade atualizada!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao atualizar atividade', error);
      showToast(`Erro ao atualizar atividade: ${error.message}`, 'error');
    }
  }, [user?.role, showToast]);

  const handleEditObjective = (id: number, currentTitle: string) => {
    setEditModalConfig({
      isOpen: true,
      title: 'Editar Objetivo',
      initialValue: currentTitle,
      inputType: 'text',
      label: 'Novo Título',
      onSave: (newTitle) => handleUpdateObjective(id, newTitle)
    });
  };

  const handleEditActivity = (id: string, field: 'title' | 'description', currentValue: string) => {
    setEditModalConfig({
      isOpen: true,
      title: field === 'title' ? 'Editar Atividade' : 'Editar Descrição',
      initialValue: currentValue,
      inputType: field === 'description' ? 'textarea' : 'text',
      label: field === 'title' ? 'Novo Título' : 'Nova Descrição',
      onSave: (newValue) => handleUpdateActivity(selectedObjective, id, field, newValue)
    });
  };

  const handleSaveFullAction = useCallback(async (updatedAction: Action) => {
    setIsSaving(true);
    try {
      // Usar upsert para criar se não existir, atualizar se existir
      const saved = await dataService.upsertAction(updatedAction);

      // 2. Atualizar estado local
      setActions(prev => {
        const exists = prev.some(a => a.uid === saved.uid);
        if (exists) {
          return prev.map(a => a.uid === saved.uid ? saved : a);
        } else {
          return [...prev, saved];
        }
      });

      // 3. Feedback
      showToast('Ação salva com sucesso!', 'success');

      // Limpar estado de ação pendente e fechar modal
      setPendingNewActionUid(null);
      setExpandedActionUid(null);
    } catch (error: any) {
      logError('App', 'Erro ao salvar ação completa', error);
      showToast(`Erro ao salvar ação: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  const handleSaveAndNewAction = useCallback(async (updatedAction: Action) => {
    setIsSaving(true);
    try {
      // 1. Salvar a ação atual
      const saved = await dataService.upsertAction(updatedAction);

      // 2. Atualizar estado local
      setActions(prev => {
        const exists = prev.some(a => a.uid === saved.uid);
        if (exists) {
          return prev.map(a => a.uid === saved.uid ? saved : a);
        } else {
          return [...prev, saved];
        }
      });

      showToast('Ação salva! Criando próxima...', 'success');

      // 3. Limpar estados da ação anterior
      setPendingNewActionUid(null);
      // NÃO fechamos o modal ainda, vamos trocar o UID para o novo

      // 4. Criar a PRÓXIMA ação (lógica similar ao handleCreateAction)
      // Precisamos dos valores mais recentes de actions
      const currentActions = actionsRef.current;
      const nextNum = getNextActionNumber(currentActions, selectedActivity, updatedAction.microregiaoId);
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
      };

      setActions(prev => [...prev, tempAction]);
      setPendingNewActionUid(tempUid);
      setExpandedActionUid(tempUid);

    } catch (error: any) {
      logError('App', 'Erro no fluxo Salvar e Nova', error);
      showToast(`Erro: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedActivity, showToast]);

  // =====================================
  // UI HELPERS
  // =====================================

  // selectedAction para o ActionDetailModal (antes era calculado via IIFE)
  const selectedAction = useMemo(() => {
    if (!expandedActionUid) return null;
    return microActions.find(a => a.uid === expandedActionUid) || null;
  }, [expandedActionUid, microActions]);

  const microregiaoNome = currentMicrorregiao
    ? currentMicrorregiao.nome
    : isViewingAllMicros
      ? 'Todas as microrregiões (somente leitura)'
      : '';

  const macrorregiaoNome = currentMicrorregiao
    ? currentMicrorregiao.macrorregiao
    : '';

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

  // Verificar se é primeiro acesso (sem LGPD aceito) e ainda não viu a landing
  if (user && !user.lgpdConsentimento) {
    if (!hasViewedLanding) {
      return (
        <LandingOnboarding
          onComplete={() => {
            // Atualiza o estado para forçar re-render e mostrar LGPD
            setHasViewedLanding(true);
          }}
        />
      );
    }

    return <LgpdConsent onAccepted={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'admin' && isAdmin) {
    return (
      <AdminPanel
        onBack={handleNavigateToMain}
        actions={actions}
        teams={teamsByMicro}
        objectives={objectives}
        activities={activities}
      />
    );
  }

  // =====================================
  // RENDER PRINCIPAL
  // =====================================
  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
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

      {/* Municipality Onboarding Modal - REMOVIDO: estava duplicado */}
      {/* O modal de primeiro acesso com completeFirstAccess está no final do arquivo */}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Excluir"
        confirmType="danger"
      />

      {/* Modal para admin criar ação escolhendo microrregião */}
      {isAdmin && isCreateActionModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsCreateActionModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Criar ação</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Escolha a microrregião onde a nova ação será criada.
                </p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
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
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
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
        setCurrentNav={(nav: string) => setCurrentNav(nav as 'strategy' | 'home' | 'settings')}
        selectedObjective={selectedObjective}
        setSelectedObjective={setSelectedObjective}
        selectedActivity={selectedActivity}
        setSelectedActivity={setSelectedActivity}
        viewMode={viewMode}
        setViewMode={setViewMode}
        objectives={objectives}
        activities={activities}
        onProfileClick={handleProfileClick}
        isMobile={isMobile}
        userName={user?.nome}
        userRole={user?.role}
        userAvatarId={user?.avatarId}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onAdminClick={() => setCurrentPage('admin')}
        onOpenSettings={handleOpenSettings}
        onAddObjective={handleAddObjective}
        onDeleteObjective={handleDeleteObjective}
        onUpdateObjective={handleUpdateObjective}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
        onUpdateActivity={(objectiveId, activityId, field, value) => handleUpdateActivity(objectiveId, activityId, field as 'title' | 'description', String(value))}
        // NOTE: Sidebar currently manages its own Edit/Delete modals internally or we need to pass the generic open handler?
        // The user asked to fix prefixes in sidebar. Now refactoring editing.
        // If we want Sidebar to use the NEW modal, we should pass onEditObjective and onEditActivity to it.
        // For now, let's keep sidebar as is or update it later (STEP 19).
        // Let's first wire up Main Content (Header/Tabs).
        // Edit Mode Props
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        showNotifications={!viewingMicroregiaoId} // Hides bell when in Micro view (moves to Header)
      />

      {/* USER SETTINGS MODAL */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        mode={allowAvatarChange ? 'avatar' : 'settings'}
      />

      {/* MAIN CONTENT */}
      <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 bg-[#f8fafc] dark:bg-slate-900 relative overflow-hidden" role="main">
        {/* HEADER */}
        <Header
          macro={macrorregiaoNome}
          micro={microregiaoNome}
          currentNav={currentNav}
          selectedObjective={selectedObjective}
          objectives={objectives}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onMenuClick={() => setIsSidebarOpen(true)}
          isMobile={isMobile}
          isAdmin={isAdmin}
          userRole={user?.role}
          onAdminClick={() => setCurrentPage('admin')}
          // Edit Mode Props
          isEditMode={isEditMode}
          // Admins e superadmins podem editar objetivos/atividades em qualquer momento
          onToggleEditMode={isAdmin ? () => setIsEditMode(!isEditMode) : undefined}
          onUpdateObjective={(id, newTitle) => handleEditObjective(id, newTitle)}
        />

        {/* SCROLLABLE AREA */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isMobile ? 'pb-mobile-nav' : ''}`}>

          {/* Breadcrumb */}
          {/* Breadcrumb removido por redundância e estética */}

          {/* Indicador sticky removido - substituído por ActivityTabs fixed */}

          {/* ACTIVITY TABS */}
          {currentNav === 'strategy' && viewMode === 'table' && (
            <div ref={activityTabsRef}>
              <ActivityTabs
                activities={activities[selectedObjective] || []}
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                isEditMode={isEditMode}
                onUpdateActivity={(id, field, value) => handleEditActivity(id, field, value)}
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
                  objectives={objectives}
                  activities={activities}
                  onNavigate={handleDashboardNavigate}
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
                      logError('App', 'Erro ao adicionar membro', error);
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
                      logError('App', 'Erro ao remover membro', error);
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
                  objectives={objectives}
                  activities={activities}
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
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  readOnly={isViewingAllMicros && !isAdmin}
                />
              </ErrorBoundary>

            ) : viewMode === 'calendar' ? (
              /* --- CALENDAR VIEW - Agenda de Ações --- */
              <ErrorBoundary>
                <div className="h-[calc(100vh-200px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <LinearCalendar
                    actions={microActions}
                    activities={activities}
                    objectives={objectives}
                    microId={currentMicroId}
                  />
                </div>
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
      <ActionDetailModal
        isOpen={!!selectedAction}
        action={selectedAction}
        team={currentTeam}
        activityName={currentActivity?.title || 'Atividade'}
        onClose={handleCloseActionModal}
        onSaveFullAction={handleSaveFullAction}
        onSaveAndNew={handleSaveAndNewAction}
        onDeleteAction={handleDeleteAction}
        isSaving={isSaving}
        canEdit={selectedAction ? checkCanEdit(selectedAction) : false}
        canDelete={selectedAction ? checkCanDelete(selectedAction) : false}
        readOnly={isViewingAllMicros && !isAdmin}
      />

      <EditNameModal
        isOpen={editModalConfig.isOpen}
        onClose={() => setEditModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSave={(newValue) => {
          editModalConfig.onSave(newValue);
          setEditModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
        title={editModalConfig.title}
        initialValue={editModalConfig.initialValue}
        inputType={editModalConfig.inputType}
        label={editModalConfig.label}
      />

      {/* FIRST ACCESS ONBOARDING MODAL */}
      {showMunicipalityModal && user && !isAdmin && (
        <MunicipalityOnboardingModal
          user={user}
          onSave={async (municipio, novaSenha) => {
            try {
              await authService.completeFirstAccess(
                user.id,
                user.email,
                municipio,
                novaSenha,
                user.microregiaoId
              );

              // Atualizar o contexto de autenticação para refletir a mudança
              if (authContext?.refreshUser) {
                await authContext.refreshUser();
              }

              setShowMunicipalityModal(false);
              showToast('Configuração concluída! Bem-vindo(a) ao sistema.', 'success');

              // Trigger onboarding tour after first access is completed
              const onboardingKey = `radar_onboarding_completed_${user.id}`;
              const hasCompletedOnboarding = localStorage.getItem(onboardingKey);
              if (!hasCompletedOnboarding) {
                setTimeout(() => setShowOnboarding(true), 500);
              }
            } catch (error: any) {
              logError('App', 'Erro no primeiro acesso', error);
              throw error; // Re-throw para o modal mostrar o erro
            }
          }}
        />
      )}

      {/* ONBOARDING TOUR */}
      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* MOBILE BOTTOM NAVIGATION */}
      {isMobile && (
        <MobileBottomNav
          currentNav={currentNav}
          viewMode={viewMode}
          onNavChange={(nav) => setCurrentNav(nav)}
          onViewModeChange={(mode) => setViewMode(mode)}
          showTeamOption={user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'gestor'}
        />
      )}

      {/* MOBILE FAB - Nova Ação */}
      {isMobile && currentNav === 'strategy' && viewMode === 'table' && checkCanCreate() && (
        <MobileFab
          onClick={handleCreateAction}
          icon={<span className="text-2xl leading-none">+</span>}
          label="Nova Ação"
          color="teal"
        />
      )}
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
      logError('LoadingFallback', 'Erro ao limpar sessão', e);
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
          <AnalyticsProvider>
            <ToastProvider>
              <Suspense fallback={<LoadingFallback />}>
                <AppContent />
              </Suspense>
            </ToastProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
