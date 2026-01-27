import { useState, useMemo, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { AlertTriangle, Target, Plus } from 'lucide-react';
import { useAppData } from './hooks/useAppData';


// Types
import {
  Status,
  Action,
  Activity,
  Objective,
  GanttRange,
  getNextActionNumber,
  filterActionsByMicro
} from './types';

// Lib
import { log, logError } from './lib/logger';
import { getActivityDisplayId, getObjectiveTitleWithoutNumber } from './lib/text';

// Data - Apenas constantes de configuração
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
import { useActionHandlers } from './hooks/useActionHandlers';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Mobile Components
import { MobileBottomNav } from './components/mobile/MobileBottomNav';
import { MobileFab } from './components/mobile/MobileActionCard';
import { MobileDrawer } from './components/mobile/MobileDrawer';

// Onboarding
import { OnboardingTour } from './components/onboarding';

// Common Components
import { ToastProvider, useToast } from './components/common/Toast';
import { ConfirmModal } from './components/common/ConfirmModal';
import { EditNameModal } from './components/common/EditNameModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DemoBanner } from './components/common/DemoBanner';

// Feature Components
import { MunicipalityOnboardingModal } from './components/auth/MunicipalityOnboardingModal';

// Lazy loaded components
const LoginPage = lazy(() => import('./features/login/LoginPage').then(m => ({ default: m.LoginPage })));
const LgpdConsent = lazy(() => import('./features/login/LgpdConsent').then(m => ({ default: m.LgpdConsent })));
const LandingOnboarding = lazy(() => import('./features/login/LandingOnboarding').then(m => ({ default: m.LandingOnboarding })));

// Dashboard e Admin
const Dashboard = lazy(() => import('./features/dashboard').then(m => ({ default: m.Dashboard })));
const OptimizedView = lazy(() => import('./features/dashboard').then(m => ({ default: m.OptimizedView })));
const GanttChart = lazy(() => import('./features/gantt/GanttChart').then(m => ({ default: m.GanttChart })));
const AdminPanel = lazy(() => import('./features/admin').then(m => ({ default: m.AdminPanel })));
const LinearCalendar = lazy(() => import('./features/admin/dashboard/LinearCalendar').then(m => ({ default: m.LinearCalendar })));

// Componentes de ações
const TeamView = lazy(() => import('./features/team/TeamView').then(m => ({ default: m.TeamView })));
const ActivityTabs = lazy(() => import('./features/actions/ActivityTabs').then(m => ({ default: m.ActivityTabs })));
const ActionTable = lazy(() => import('./features/actions/ActionTable').then(m => ({ default: m.ActionTable })));
const ActionDetailModal = lazy(() => import('./features/actions/ActionDetailModal').then(m => ({ default: m.ActionDetailModal })));

// Settings e News
const UserSettingsModal = lazy(() => import('./features/settings/UserSettingsModal').then(m => ({ default: m.UserSettingsModal })));
const NewsFeed = lazy(() => import('./features/news/NewsFeed').then(m => ({ default: m.NewsFeed })));

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
  const isDemoMode = authContext?.isDemoMode ?? false;
  // ✅ isContextLoading removido - _isLoading já cobre o caso de contexto null

  // --- NAVIGATION STATE ---
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'lgpd'>('main');
  const [didAutoOpenAdmin, setDidAutoOpenAdmin] = useState(false);
  const [hasViewedLanding, setHasViewedLanding] = useState(false);
  // --- DATA STATE (via useAppData) ---
  const {
    actions,
    setActions,
    objectives,
    setObjectives,
    activities,
    setActivities,
    teamsByMicro,
    setTeamsByMicro,
    // isDataLoading,  // Unused
    // dataError,      // Unused
    // loadData,       // Unused
    // refreshActions, // Unused
    selectedObjective,
    setSelectedObjective,
    selectedActivity,
    setSelectedActivity
  } = useAppData();

  // --- UI STATE RESTORED ---
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'team' | 'optimized' | 'calendar'>('table');
  const [ganttRange, setGanttRange] = useState<GanttRange>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false); // Drawer mobile para hierarquia
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings' | 'dashboard' | 'news'>('news');
  // NOTA: showStickyActivity calculado mas não consumido na UI atual - mantido para uso futuro
  const [, setShowStickyActivity] = useState<boolean>(false);

  // Reseta o estado da landing page quando o usuário faz logout
  useEffect(() => {
    if (!user) {
      setHasViewedLanding(false);
    }
  }, [user]);

  // =====================================
  // NOTIFICATION STATE
  // =====================================
  const [isEditMode, setIsEditMode] = useState(false); // New lifted state
  const activityTabsRef = useRef<HTMLDivElement | null>(null);

  const actionsRef = useRef<Action[]>(actions); // Referência atualizada para callbacks
  const [expandedActionUid, setExpandedActionUid] = useState<string | null>(null);

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
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap' | undefined>(undefined);
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

  // Objetivos filtrados por microrregião
  const filteredObjectives = useMemo(() => {
    if (isViewingAllMicros) return objectives;
    return objectives.filter(o => !o.microregiaoId || o.microregiaoId === currentMicroId);
  }, [objectives, currentMicroId, isViewingAllMicros]);

  // Atividades filtradas (apenas das objectives filtradas)
  const filteredActivities = useMemo(() => {
    if (isViewingAllMicros) return activities;
    const filteredObjIds = new Set(filteredObjectives.map(o => o.id));
    const result: Record<number, Activity[]> = {};
    for (const [objId, acts] of Object.entries(activities)) {
      if (filteredObjIds.has(Number(objId))) {
        result[Number(objId)] = acts;
      }
    }
    return result;
  }, [activities, filteredObjectives, isViewingAllMicros]);

  // Ações filtradas para o Gantt
  const ganttActions = useMemo(() => {
    const objectiveActivityIds = filteredActivities[selectedObjective]?.map(a => a.id) || [];
    return microActions
      .filter(a => objectiveActivityIds.includes(a.activityId))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [microActions, selectedObjective, filteredActivities]);

  const currentActivity = filteredActivities[selectedObjective]?.find(a => a.id === selectedActivity) || filteredActivities[selectedObjective]?.[0];


  // =====================================
  // EFFECTS
  // =====================================

  // ✅ FASE 2: Consolidar useEffects relacionados a autenticação e navegação
  useEffect(() => {
    // NOTA: A lógica de LGPD é tratada diretamente no render condicional,
    // não precisamos setar currentPage para 'lgpd'

    // Admin vai direto para o painel administrativo ao logar
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
  // Check for first-time access onboarding (municipality + password)
  useEffect(() => {
    // DEBUG: Log para investigar por que o modal não abre
    if (user) {
      log('App', 'Verificando FirstAccess', {
        id: user.id,
        auth: isAuthenticated,
        admin: isAdmin,
        firstAccess: user.firstAccess,
        modalOpen: showMunicipalityModal
      });
    }

    // Apenas usuários com firstAccess = true precisam completar onboarding (incluindo Admins/Gestores)
    if (isAuthenticated && user && user.firstAccess) {
      log('App', '🚨 Triggering Municipality Modal - User needs setup');
      setShowMunicipalityModal(true);
    }
  }, [isAuthenticated, user, user?.firstAccess]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // CARREGAR DADOS DO SUPABASE (Delegado para useAppData)
  // =====================================
  // O hook useAppData já gerencia o carregamento inicial e cache.
  // Mantemos este comentário para clareza.


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
      // Bloqueia se não há atividade selecionada (implica que não há objetivos)
      // Mesmo admins precisam de atividades para criar ações
      if (!selectedActivity) return false;
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
  }, [user, isAdmin, isViewingAllMicros, currentMicroId, selectedActivity]);

  // Aliases para compatibilidade
  const checkCanEdit = permissions.checkCanEdit;
  const checkCanDelete = permissions.checkCanDelete;
  const checkCanCreate = permissions.checkCanCreate;
  const checkCanManageTeam = permissions.checkCanManageTeam;

  // =====================================
  // ACTION HANDLERS (usam UID)
  // =====================================

  // =====================================
  // ACTION HANDLERS (Delegado para useActionHandlers)
  // =====================================

  const {
    handleUpdateAction,
    handleSaveAction,
    handleCreateAction,
    handleDeleteAction,
    handleAddRaci,
    handleRemoveRaci,
    handleAddComment,
    handleBulkCreateActions,
  } = useActionHandlers({
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
  });

  // Handler para fechar o modal de ação - remove ação pendente se não foi salva
  const handleCloseActionModal = useCallback(() => {
    if (pendingNewActionUid && expandedActionUid === pendingNewActionUid) {
      // Remover a ação temporária que não foi salva
      setActions(prev => prev.filter(a => a.uid !== pendingNewActionUid));
      setPendingNewActionUid(null);
      showToast('Ação descartada', 'info');
    }
    setExpandedActionUid(null);
  }, [pendingNewActionUid, expandedActionUid, showToast, setActions]);

  const handleConfirmCreateInMicro = useCallback(() => {
    if (!createActionMicroId) {
      showToast('Selecione uma microrregião', 'error');
      return;
    }

    setIsCreateActionModalOpen(false);

    // Pequeno delay para permitir que o modal feche antes de chamar a criação
    // que pode depender de estado
    setTimeout(() => {
      // Logic to create in specific micro - handled by passing microId override?
      // Actually the original code did logic here.
      // Let's reimplement just this specific special case helper here using the basics

      const nextNum = getNextActionNumber(actions, selectedActivity, createActionMicroId);
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
  }, [actions, createActionMicroId, selectedActivity, viewMode, showToast, setActions, setViewMode]);

  // Handler para expandir ação e carregar comentários sob demanda
  const handleExpandAction = useCallback(async (uid: string | null) => {
    if (!uid) {
      setExpandedActionUid(null);
      return;
    }

    setExpandedActionUid(uid);

    // Encontrar a ação para verificar se precisa carregar comentários
    // Usar actions (state) pois é apenas leitura para decisão, não mutation
    const action = actions.find(a => a.uid === uid);

    // Se tem contagem > 0 mas 0 carregados, busca do servidor
    if (action && (action.commentCount || 0) > 0 && action.comments.length === 0) {
      try {
        const comments = await dataService.loadActionComments(uid);
        setActions(prev => prev.map(a =>
          a.uid === uid ? { ...a, comments } : a
        ));
      } catch (error) {
        logError('App', 'Erro ao carregar comentários on-demand', error);
      }
    }
  }, [actions, setExpandedActionUid, setActions]);




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



  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleGanttActionClick = useCallback((action: Action) => {
    setSelectedActivity(action.activityId);
    // setViewMode('table'); // Removido para manter no Gantt
    setExpandedActionUid(action.uid);
  }, [setSelectedActivity]);

  const handleNavigateToMain = useCallback(() => {
    setCurrentPage('main');
  }, []);

  // Handler para navegação do Dashboard
  const handleDashboardNavigate = useCallback((view: 'list' | 'team', filters?: { status?: string; objectiveId?: number }) => {
    setCurrentNav('strategy');

    if (view === 'team') {
      setViewMode('team');
      return;
    }

    setViewMode('table');
    if (filters?.status) {
      // Cast to match the expected specific string literals
      setStatusFilter(filters.status as any);
    }
    if (filters?.objectiveId) {
      setSelectedObjective(filters.objectiveId);
    }
  }, [setSelectedObjective]);

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
      // Usar a posição sequencial (quantidade de objetivos + 1) NO CONTEXTO FILTRADO
      const nextDisplayNumber = filteredObjectives.length + 1;
      const newTitle = `${nextDisplayNumber}. Novo Objetivo`;

      // Salvar no banco
      const newObjective = await dataService.createObjective(newTitle, targetMicroId);

      // Criar automaticamente a primeira atividade para este objetivo
      const firstActivityId = `${targetMicroId}_${nextDisplayNumber}.1`;
      const firstActivityTitle = 'Nova Atividade';
      const firstActivityDescription = 'Descrição da atividade.';

      const firstActivity = await dataService.createActivity(
        newObjective.id,
        firstActivityId,
        firstActivityTitle,
        targetMicroId,
        firstActivityDescription
      );

      setObjectives(prev => [...prev, newObjective]);
      setActivities(prev => ({
        ...prev,
        [newObjective.id]: [firstActivity], // Iniciar com a primeira atividade
      }));
      showToast('Objetivo e atividade criados!', 'success');
    } catch (error: any) {
      logError('App', 'Erro ao criar objetivo', error);
      showToast(`Erro ao criar objetivo: ${error.message}`, 'error');
    }
  }, [filteredObjectives, user?.role, user?.microregiaoId, currentMicroId, showToast, setObjectives, setActivities]);

  // ✅ NOVA FUNÇÃO: Renumerar tudo após exclusão
  // Movida para antes de handleDeleteObjective para estar no escopo correto e ser dependência
  const renumberObjectivesAndActivities = useCallback(async (currentObjectives: Objective[]) => {
    try {
      // 1. Iterar sobre todos os objetos restantes
      for (let i = 0; i < currentObjectives.length; i++) {
        const obj = currentObjectives[i];
        const targetNumber = i + 1; // 1, 2, 3...

        // --- A. Renumerar Objetivo (Título) ---
        const cleanTitle = getObjectiveTitleWithoutNumber(obj.title);
        const newTitle = `${targetNumber}. ${cleanTitle}`;

        // Se título já começa com o número correto, pular
        if (!obj.title.startsWith(`${targetNumber}.`)) {
          await dataService.updateObjective(obj.id, { title: newTitle });
          // Atualizar estado local
          setObjectives(prev => prev.map(o => o.id === obj.id ? { ...o, title: newTitle } : o));
        }

        // --- B. Renumerar Atividades (IDs) ---
        const objActivities = activities[obj.id] || [];
        const newActivitiesList: any[] = [];
        let activitiesChanged = false;

        for (const act of objActivities) {
          // ID esperado: "Micro_ObjNum.ActNum" ou "ObjNum.ActNum"

          // Extrair o sufixo da atividade (ex: "1.1")
          const displayId = getActivityDisplayId(act.id); // "1.1"
          const parts = displayId.split('.');
          const actNum = parts.length > 1 ? parts[1] : parts[0]; // "1"

          // Novo ID base: "TargetNum.ActNum" (ex: "1.1")
          const correctDisplayId = `${targetNumber}.${actNum}`;

          // Se o ID de exibição atual é diferente do correto
          if (!displayId.startsWith(`${targetNumber}.`)) {
            activitiesChanged = true;

            // Extrair e manter prefixo + identificar microrregião
            let microregiaoId = '';
            let newFullId = correctDisplayId;

            if (act.id.includes('_')) {
              const parts = act.id.split('_');
              microregiaoId = parts[0];
              newFullId = `${microregiaoId}_${correctDisplayId}`;
            } else {
              // Fallback se não tiver prefixo (legado/global)
              microregiaoId = (currentMicroId && currentMicroId !== 'all') ? currentMicroId : (user?.microregiaoId || '');
              // Manter sem prefixo se não tinha ou adicionar? Vou manter a lógica do ID original.
              newFullId = correctDisplayId;
            }

            log('App', `Renumerando Atividade: ${act.id} -> ${newFullId}`);

            // 1. Criar NOVA atividade com o ID correto (cópia)
            const newAct = await dataService.createActivity(
              obj.id,
              newFullId,
              act.title,
              microregiaoId, // FIXED: Usando ID extraído ou fallback
              act.description
            );

            // 2. Mover todas as ações da atividade antiga para a nova
            const relatedActions = actions.filter(a => a.activityId === act.id);
            for (const action of relatedActions) {
              await dataService.updateActionActivityId(action.uid, newFullId);
            }

            // 3. Excluir atividade antiga
            await dataService.deleteActivity(act.id);

            newActivitiesList.push(newAct);
          } else {
            newActivitiesList.push(act);
          }
        }

        if (activitiesChanged) {
          // Recarregar tudo para garantir consistência
          const freshActivities = await dataService.loadActivities();
          const freshActions = await dataService.loadActions();
          setActivities(freshActivities);
          setActions(freshActions);
        }
      }

      showToast('Numeração atualizada com sucesso!', 'success');

    } catch (error: any) {
      logError('App', 'Erro ao renumerar', error);
      showToast(`Erro na renumeração: ${error.message}`, 'error');
    }
  }, [activities, actions, currentMicroId, user?.microregiaoId, showToast, setObjectives, setActivities, setActions]);

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

      showToast('Objetivo excluído! Renumerando...', 'info');

      // ✅ RENUMERAR SEQUENCIALMENTE (Filtered Context)
      setTimeout(() => {
        // Se estamos vendo "Todas", precisamos encontrar qual micro renumenar
        // Mas como a exclusão já ocorreu no banco, e não temos o objeto deletado facilmente aqui a menos que buscássemos antes...
        // Como fallback, usamos filteredObjectives (que já exclui o removido no próximo render, mas aqui usamos o current state)
        // O ideal é filtrar o ID removido da lista que faz sentido.

        let listToRenumber: Objective[] = [];

        if (isViewingAllMicros) {
          // Se vendo todas, pegar apenas os objetivos da MESMA micro do objetivo excluído
          // Como não temos o objeto 'deleted' aqui (já deletado do banco), vamos assumir que renumeração em massa 
          // NO MODO "VER TODAS" é arriscado. 
          // Melhor estratégia: Pegar a lista *atual* filtrada (que é "todas") e filtrar o ID.
          // ISSO IRIA RENUMERAR TUDO GLOBALMENTE 1..N. PERIGOSO.
          // CORREÇÃO: Pegar o objetivo antes de deletar seria ideal.
          // Mas dado a limitação, vamos usar filteredObjectives se NÃO for view-all.
          // Se for view-all, alertamos ou pulamos renumeração para evitar caos.

          // HACK SEGURO: Apenas renumerar se estiver vendo uma micro específica
          log('App', 'Pulando renumeração automática em modo "Ver Todas" por segurança');
        } else {
          listToRenumber = filteredObjectives.filter(o => o.id !== id);
          renumberObjectivesAndActivities(listToRenumber);
        }
      }, 500);

    } catch (error: any) {
      showToast(`Erro ao excluir objetivo: ${error.message}`, 'error');
    }
  }, [user?.role, activities, actions, selectedObjective, showToast, renumberObjectivesAndActivities, objectives, filteredObjectives, isViewingAllMicros, setObjectives, setActivities, setSelectedObjective, setSelectedActivity]);



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

    // Calcular a posição sequencial do objetivo (1, 2, 3...) baseado na lista de objetivos FILTRADA
    const objectiveIndex = filteredObjectives.findIndex(o => o.id === objectiveId);
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
  }, [user?.role, user?.microregiaoId, currentMicroId, activities, showToast, filteredObjectives, setActivities]);

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
  }, [user?.role, actions, activities, selectedActivity, showToast, setActivities, setSelectedActivity]);

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
  }, [user?.role, showToast, setObjectives]);

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
  }, [user?.role, showToast, setActivities]);

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
  }, [showToast, setActions]);

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
        tags: [],
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
  }, [selectedActivity, showToast, setActions]);

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
      ? 'Todas as microrregiões'
      : '';

  const macrorregiaoNome = currentMicrorregiao
    ? currentMicrorregiao.macrorregiao
    : '';

  // =====================================
  // UI HANDLERS
  // =====================================

  const handleOpenSettings = (mode: 'settings' | 'avatar' = 'settings', initialTab?: 'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap') => {
    console.log('[App] Opening settings:', { mode, initialTab });
    setAllowAvatarChange(mode === 'avatar');
    setSettingsInitialTab(initialTab);
    setIsSettingsModalOpen(true);
  };

  // =====================================
  // RENDERIZAÇÃO CONDICIONAL
  // =====================================

  // ✅ CORREÇÃO FINAL: Mostrar loading APENAS quando o contexto ainda não está pronto
  // Isso é diferente de "está carregando durante o login"
  if (!authContext) {
    return <LoadingFallback />;
  }

  // ✅ FIX P0: Tratar sessão existente mas perfil falho (Ghost Session)
  // Se existe sessão no Supabase mas o perfil não carregou (user == null), 
  // não podemos mostrar LoginPage senão o usuário entra em loop.
  // IMPORTANTE: Usamos as variáveis já extraídas (user) e acessamos as novas do contexto
  if (authContext.hasSession && !user) {
    if (authContext.profileLoadError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar perfil</h2>
            <p className="text-slate-600 mb-6 text-sm">{authContext.profileLoadError}</p>
            <div className="p-4 bg-slate-50 rounded-lg mb-6 text-left text-xs text-slate-500 font-mono overflow-auto max-h-32">
              Dica: Verifique sua conexão ou se suas permissões de acesso (RLS) estão corretas.
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => authContext.refreshUser()}
                className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>Tentar Novamente</span>
              </button>

              <button
                onClick={() => logout()}
                className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Fazer Logout e Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Se não tem erro ainda, está carregando perfil
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

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <DemoBanner onLoginClick={logout} />
      )}

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



      {/* SIDEBAR - Desktop only when micro selected, or anytime on mobile without micro */}
      {/* No mobile com micro selecionada, usamos o MobileDrawer ao invés da Sidebar */}
      {!(isMobile && viewingMicroregiaoId) && (
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentNav={currentNav}
          setCurrentNav={(nav: string) => setCurrentNav(nav as 'strategy' | 'home' | 'settings' | 'dashboard' | 'news')}
          selectedObjective={selectedObjective}
          setSelectedObjective={setSelectedObjective}
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          viewMode={viewMode}
          setViewMode={setViewMode}
          objectives={filteredObjectives}
          activities={filteredActivities}
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
      )}

      {/* MOBILE DRAWER - Para hierarquia de objetivos no mobile quando micro selecionada */}
      {isMobile && viewingMicroregiaoId && (
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          objectives={filteredObjectives}
          activities={filteredActivities}
          selectedObjective={selectedObjective}
          selectedActivity={selectedActivity}
          onSelectObjective={setSelectedObjective}
          onSelectActivity={setSelectedActivity}
          onGoToStrategy={() => {
            setCurrentNav('strategy');
            setViewMode('table');
          }}
          userName={user?.nome}
          userRole={user?.role}
          userAvatarId={user?.avatarId}
          isAdmin={isAdmin}
          onAdminClick={() => setCurrentPage('admin')}
          onSettingsClick={() => handleOpenSettings('settings')}
          onAvatarClick={() => handleOpenSettings('avatar')}
          onCalendarClick={() => {
            setCurrentNav('strategy');
            setViewMode('calendar');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* USER SETTINGS MODAL */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        mode={allowAvatarChange ? 'avatar' : 'settings'}
        initialTab={settingsInitialTab}
      />

      {/* MAIN CONTENT */}
      <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 bg-[#f8fafc] dark:bg-slate-900 relative overflow-hidden" role="main">
        {/* HEADER */}
        <Header
          macro={macrorregiaoNome}
          micro={microregiaoNome}
          currentNav={currentNav}
          selectedObjective={selectedObjective}
          objectives={filteredObjectives}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onMenuClick={() => {
            // No mobile com micro selecionada, abre o MobileDrawer
            // Caso contrário, abre a Sidebar tradicional
            if (isMobile && viewingMicroregiaoId) {
              setIsMobileDrawerOpen(true);
            } else {
              setIsSidebarOpen(true);
            }
          }}
          isMobile={isMobile}
          isAdmin={isAdmin}
          userRole={user?.role}
          onAdminClick={() => setCurrentPage('admin')}
          // Edit Mode Props
          isEditMode={isEditMode}
          // Admins e superadmins podem editar objetivos/atividades em qualquer momento
          onToggleEditMode={isAdmin ? () => setIsEditMode(!isEditMode) : undefined}
          onUpdateObjective={(id, newTitle) => handleEditObjective(id, newTitle)}
          onNavigate={(nav) => setCurrentNav(nav)}
        />

        {/* SCROLLABLE AREA */}
        {/* Padding extra quando FAB está visível (mobile + strategy + table + canCreate) */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isMobile
          ? (currentNav === 'strategy' && viewMode === 'table' && checkCanCreate()
            ? 'pb-mobile-nav-with-fab'
            : 'pb-mobile-nav')
          : ''
          }`}>

          {/* Breadcrumb */}
          {/* Breadcrumb removido por redundância e estética */}

          {/* Indicador sticky removido - substituído por ActivityTabs fixed */}

          {/* ACTIVITY TABS */}
          {currentNav === 'strategy' && viewMode === 'table' && (
            <div ref={activityTabsRef}>
              {(filteredObjectives.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
                    <Target size={32} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Nenhum objetivo definido
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
                    É necessário criar um objetivo estratégico e atividades relacionadas antes de adicionar ações.
                  </p>
                  {(isAdmin || user?.role === 'gestor') && (
                    <button
                      onClick={handleAddObjective}
                      className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      <Plus size={18} /> Criar Primeiro Objetivo
                    </button>
                  )}
                </div>
              ) : (
                <ActivityTabs
                  activities={filteredActivities[selectedObjective] || []}
                  selectedActivity={selectedActivity}
                  setSelectedActivity={setSelectedActivity}
                  isEditMode={isEditMode}
                  onUpdateActivity={(id, field, value) => handleEditActivity(id, field, value)}
                />
              )}
            </div>
          )}

          <div className="p-4 sm:p-6" ref={chartContainerRef}>

            {/* --- DASHBOARD VIEW (OLD HOME) --- */}
            {currentNav === 'dashboard' ? (
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
                  <Dashboard
                    actions={microActions}
                    team={currentTeam}
                    objectives={objectives}
                    activities={activities}
                    onNavigate={handleDashboardNavigate}
                  />
                </Suspense>
              </ErrorBoundary>

              /* --- NEWS FEED (NEW HOME) --- */
            ) : currentNav === 'news' || currentNav === 'home' ? (
              <ErrorBoundary>
                <NewsFeed onOpenRoadmap={() => handleOpenSettings('settings', 'roadmap')} />
              </ErrorBoundary>

              /* --- GANTT VIEW --- */
            ) : viewMode === 'gantt' && currentNav === 'strategy' ? (
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
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
                </Suspense>
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
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
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
                    onSaveAction={handleSaveAction}
                    onDeleteAction={handleDeleteAction}
                    onAddRaci={handleAddRaci}
                    onRemoveRaci={handleRemoveRaci}
                    onAddComment={handleAddComment}
                    onViewDetails={handleExpandAction}
                    readOnly={isViewingAllMicros && !isAdmin}
                  />
                </Suspense>
              </ErrorBoundary>

            ) : viewMode === 'calendar' ? (
              /* --- CALENDAR VIEW - Agenda de Ações --- */
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
                  <div className="h-[calc(100vh-200px)] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <LinearCalendar
                      actions={microActions}
                      activities={activities}
                      objectives={objectives}
                      microId={currentMicroId}
                    />
                  </div>
                </Suspense>
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
                    objectives={filteredObjectives}
                    activities={filteredActivities}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    responsibleFilter={responsibleFilter}
                    setResponsibleFilter={setResponsibleFilter}
                    expandedActionId={expandedActionUid}
                    setExpandedActionId={handleExpandAction}
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
                    onBulkImport={handleBulkCreateActions}
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
      {showMunicipalityModal && user && (
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
              // Auto-login com a nova senha para evitar que o usuário seja desconectado
              if (authContext) {
                log('App', 'Realizando auto-login após alteração de senha...');
                await authContext.login(user.email, novaSenha);
              }

              setShowMunicipalityModal(false);

              // FORCE NAVIGATION TO MURAL (NEWS)
              // This is critical to ensure the user doesn't land on "Team" view or other restricted areas
              setCurrentNav('news');
              setViewMode('table');

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
          <p className="text-sm text-slate-500 mb-3 animate-pulse">
            Estamos restabelecendo a conexão. Isso pode levar alguns instantes.
          </p>
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
