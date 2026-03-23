import { useState, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import { Status, GanttRange } from './types';
import { AuthProvider } from './auth';
import { useAuthSafe } from './auth/AuthContext';
import { useResponsive } from './hooks/useMediaQuery';
import { useAppAccessFlow } from './hooks/useAppAccessFlow';
import { useActionHandlers } from './hooks/useActionHandlers';
import { useActionPermissions } from './hooks/useActionPermissions';
import { useAppShellHandlers } from './hooks/useAppShellHandlers';
import { useAppUiEffects } from './hooks/useAppUiEffects';
import { useObjectiveActivityEditModal } from './hooks/useObjectiveActivityEditModal';
import { useObjectiveActivityHandlers } from './hooks/useObjectiveActivityHandlers';
import { useNavigationHandlers } from './hooks/useNavigationHandlers';
import { useScopedAppData } from './hooks/useScopedAppData';
import { useTeamHandlers } from './hooks/useTeamHandlers';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StrategyPageHeader } from './components/layout/StrategyPageHeader';
import { MainView } from './components/main/MainView';
import { MobileDrawer } from './components/mobile/MobileDrawer';
import { ToastProvider, useToast } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DemoBanner } from './components/common/DemoBanner';
import { AppGlobalStyles } from './components/app/AppGlobalStyles';
import { AppEntryGate } from './components/app/AppEntryGate';
import { ObservabilityBootstrap } from './components/app/ObservabilityBootstrap';
import { AppOverlays } from './components/app/AppOverlays';
import { LoadingFallback } from './components/app/LoadingFallback';
import type { Workspace } from './components/app/WorkspaceSelector';

const UserSettingsModal = lazy(() =>
  import('./features/settings/UserSettingsModal').then(m => ({ default: m.UserSettingsModal }))
);

function AppContent() {
  const { isMobile } = useResponsive();
  const { showToast } = useToast();
  const authContext = useAuthSafe();

  const user = authContext?.user ?? null;
  const isAdmin = authContext?.isAdmin ?? false;
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const currentMicrorregiao = authContext?.currentMicrorregiao ?? null;
  const logout = useMemo(() => authContext?.logout ?? (() => {}), [authContext?.logout]);
  const viewingMicroregiaoId = authContext?.viewingMicroregiaoId ?? null;
  const isDemoMode = authContext?.isDemoMode ?? false;

  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'lgpd'>('main');
  const {
    actions,
    setActions,
    objectives,
    setObjectives,
    activities,
    setActivities,
    teamsByMicro,
    setTeamsByMicro,
    selectedObjective,
    setSelectedObjective,
    selectedActivity,
    setSelectedActivity,
  } = useAppData();

  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'team' | 'optimized' | 'calendar'>('table');
  const [ganttRange, setGanttRange] = useState<GanttRange>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [currentNav, setCurrentNav] = useState<'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository'>('news');
  const [, setShowStickyActivity] = useState<boolean>(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const activityTabsRef = useRef<HTMLDivElement | null>(null);
  const [expandedActionUid, setExpandedActionUid] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('');
  const [involvedAreaFilter, setInvolvedAreaFilter] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [ganttStatusFilter, setGanttStatusFilter] = useState<Status | 'all'>('all');
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [createActionMicroId, setCreateActionMicroId] = useState<string>('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [allowAvatarChange, setAllowAvatarChange] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap' | undefined>(undefined);

  const {
    handleLandingComplete,
    handleOnboardingComplete,
    handleOnboardingSkip,
    hasViewedLanding,
    openOnboarding,
    setShowMunicipalityModal,
    showMunicipalityModal,
    showOnboarding,
  } = useAppAccessFlow({
    isAuthenticated,
    isAdmin,
    user,
  });

  const [pendingNewActionUid, setPendingNewActionUid] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const lastAdminViewedMicroregiaoIdRef = useRef<string | null>(null);

  const {
    allTeams,
    currentActivity,
    currentMicroId,
    currentTeam,
    filteredActivities,
    filteredObjectives,
    ganttActions,
    isViewingAllMicros,
    macrorregiaoNome,
    microActions,
    microregiaoNome,
    readOnly,
  } = useScopedAppData({
    actions,
    objectives,
    activities,
    teamsByMicro,
    selectedObjective,
    selectedActivity,
    currentMicrorregiao,
    viewingMicroregiaoId,
    user,
    isAdmin,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentWorkspace(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAdmin || currentPage !== 'main') {
      lastAdminViewedMicroregiaoIdRef.current = viewingMicroregiaoId;
      return;
    }

    const previousMicroregiaoId = lastAdminViewedMicroregiaoIdRef.current;

    if (viewingMicroregiaoId && viewingMicroregiaoId !== previousMicroregiaoId) {
      setCurrentWorkspace('planning');
      setCurrentNav('strategy');
      setViewMode('table');
    }

    lastAdminViewedMicroregiaoIdRef.current = viewingMicroregiaoId;
  }, [currentPage, isAdmin, viewingMicroregiaoId]);

  useAppUiEffects({
    activityTabsRef,
    chartContainerRef,
    createActionMicroId,
    currentNav,
    expandedActionUid,
    isCreateActionModalOpen,
    isMobile,
    isSidebarOpen,
    selectedActivity,
    viewingMicroregiaoId,
    viewMode,
    setContainerWidth,
    setCreateActionMicroId,
    setCurrentNav,
    setGanttRange,
    setIsSidebarOpen,
    setShowStickyActivity,
  });

  const {
    checkCanCreate,
    checkCanDelete,
    checkCanEdit,
    checkCanManageTeam,
  } = useActionPermissions({
    user,
    isAdmin,
    isViewingAllMicros,
    currentMicroId,
    selectedActivity,
  });

  const {
    handleUpdateAction,
    handleSaveAction,
    handleCreateAction,
    handleDeleteAction,
    handleAddRaci,
    handleRemoveRaci,
    handleAddComment,
    handleBulkCreateActions,
    handleCloseActionModal,
    handleConfirmCreateInMicro,
    handleExpandAction,
    handleGanttActionClick,
    handleSaveFullAction,
    handleSaveAndNewAction,
  } = useActionHandlers({
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
    setIsCreateActionModalOpen,
  });

  const {
    handleProfileClick,
    handleLogout,
    handleNavigateToMain,
    handleDashboardNavigate,
    handleOpenSettings,
  } = useNavigationHandlers({
    isAdmin,
    logout,
    setCurrentPage,
    setCurrentNav,
    setViewMode,
    setStatusFilter,
    setSelectedObjective,
    setAllowAvatarChange,
    setSettingsInitialTab,
    setIsSettingsModalOpen,
  });

  const {
    handleCurrentNavChange,
    handleOpenAdminPage,
    handleToggleSidebar,
    handleHeaderMenuClick,
    handleCloseMobileDrawer,
    handleGoToStrategyTable,
    handleGoToStrategyCalendar,
    handleCloseSettingsModal,
    handleToggleEditMode,
    handleOpenSettingsPanel,
    handleOpenAvatarSettings,
    handleOpenRoadmapSettings,
  } = useAppShellHandlers({
    isMobile,
    viewingMicroregiaoId,
    setCurrentPage,
    setCurrentNav,
    setViewMode,
    setIsSidebarOpen,
    setIsMobileDrawerOpen,
    setIsSettingsModalOpen,
    setIsEditMode,
    handleOpenSettings,
  });

  const {
    handleAddObjective,
    handleDeleteObjective,
    handleAddActivity,
    handleDeleteActivity,
    handleUpdateObjective,
    handleUpdateActivity,
    handleUpdateObjectiveField,
  } = useObjectiveActivityHandlers({
    userRole: user?.role,
    userMicroregiaoId: user?.microregiaoId,
    currentMicroId,
    isViewingAllMicros,
    filteredObjectives,
    objectives,
    activities,
    actions,
    selectedObjective,
    selectedActivity,
    setObjectives,
    setActivities,
    setActions,
    setSelectedObjective,
    setSelectedActivity,
    showToast,
  });

  const {
    editModalConfig,
    closeEditModal,
    saveEditModal,
    handleEditObjective,
    handleEditObjectiveField,
    handleEditActivity,
  } = useObjectiveActivityEditModal({
    selectedObjective,
    handleUpdateObjective,
    handleUpdateObjectiveField,
    handleUpdateActivity,
  });

  const {
    handleUpdateTeam,
    handleAddMember,
    handleRemoveMember,
  } = useTeamHandlers({
    setTeamsByMicro,
    showToast,
  });

  const handleSidebarUpdateActivity = useCallback((
    objectiveId: number,
    activityId: string,
    field: string,
    value: string | number | boolean
  ) => {
    if (field === 'title' || field === 'description') {
      handleUpdateActivity(objectiveId, activityId, field, String(value));
    }
  }, [handleUpdateActivity]);

  const handleWorkspaceSelect = useCallback((ws: Workspace) => {
    setCurrentWorkspace(ws);
    setCurrentPage('main');
    if (ws === 'community') {
      setCurrentNav('hub');
    } else {
      setCurrentNav('strategy');
      setViewMode('table');
    }
  }, []);

  const handleSwitchWorkspace = useCallback(() => {
    setCurrentWorkspace(prev => {
      const next = prev === 'community' ? 'planning' : 'community';
      setCurrentPage('main');
      if (next === 'community') {
        setCurrentNav('hub');
      } else {
        setCurrentNav('strategy');
        setViewMode('table');
      }
      return next;
    });
  }, []);

  return (
    <AppEntryGate
      authContext={authContext}
      user={user}
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      viewingMicroregiaoId={viewingMicroregiaoId}
      hasViewedLanding={hasViewedLanding}
      currentPage={currentPage}
      actions={actions}
      teamsByMicro={teamsByMicro}
      objectives={objectives}
      activities={activities}
      currentWorkspace={currentWorkspace}
      onWorkspaceSelect={handleWorkspaceSelect}
      onLandingComplete={handleLandingComplete}
      onLgpdAccepted={() => setCurrentPage('main')}
      onLogout={logout}
      onRefreshProfile={authContext?.refreshUser ?? (async () => {})}
      onBackFromAdmin={handleNavigateToMain}
    >
      <div className="flex h-[100dvh] w-full bg-[#f8fafc] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
        <AppGlobalStyles />

        {isDemoMode && <DemoBanner onLoginClick={logout} />}

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Ir para conteúdo principal
        </a>

        {!(isMobile && viewingMicroregiaoId) && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={handleToggleSidebar}
            currentNav={currentNav}
            setCurrentNav={handleCurrentNavChange}
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
            userAvatarId={user?.avatarId}
            onLogout={handleLogout}
            onAdminClick={handleOpenAdminPage}
            onOpenSettings={handleOpenSettings}
            onAddObjective={handleAddObjective}
            onDeleteObjective={handleDeleteObjective}
            onUpdateObjective={handleUpdateObjective}
            onAddActivity={handleAddActivity}
            onDeleteActivity={handleDeleteActivity}
            onUpdateActivity={handleSidebarUpdateActivity}
            isEditMode={isEditMode}
            onToggleEditMode={handleToggleEditMode}
            showNotifications={!viewingMicroregiaoId}
            currentWorkspace={currentWorkspace ?? 'planning'}
            onSwitchWorkspace={handleSwitchWorkspace}
          />
        )}

        {isMobile && viewingMicroregiaoId && (
          <MobileDrawer
            isOpen={isMobileDrawerOpen}
            onClose={handleCloseMobileDrawer}
            objectives={filteredObjectives}
            activities={filteredActivities}
            selectedObjective={selectedObjective}
            selectedActivity={selectedActivity}
            onSelectObjective={setSelectedObjective}
            onSelectActivity={setSelectedActivity}
            onGoToStrategy={handleGoToStrategyTable}
            userName={user?.nome}
            userAvatarId={user?.avatarId}
            onAdminClick={handleOpenAdminPage}
            onSettingsClick={handleOpenSettingsPanel}
            onAvatarClick={handleOpenAvatarSettings}
            onCalendarClick={handleGoToStrategyCalendar}
            onLogout={handleLogout}
          />
        )}

        <main id="main-content" className="flex-1 flex flex-col h-full min-w-0 bg-[#f8fafc] dark:bg-slate-900 relative overflow-hidden" role="main">
          <Header
            macro={macrorregiaoNome}
            micro={microregiaoNome}
            currentNav={currentNav}
            selectedObjective={selectedObjective}
            objectives={filteredObjectives}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onMenuClick={handleHeaderMenuClick}
            isMobile={isMobile}
            isAdmin={isAdmin}
            onAdminClick={handleOpenAdminPage}
            isEditMode={isEditMode}
            onToggleEditMode={isAdmin ? handleToggleEditMode : undefined}
            onUpdateObjective={handleEditObjectiveField}
            onNavigate={handleCurrentNavChange}
          />

          {currentNav === 'strategy' && (
            <StrategyPageHeader
              macro={macrorregiaoNome}
              micro={microregiaoNome}
              selectedObjective={selectedObjective}
              objectives={filteredObjectives}
              isEditMode={isEditMode}
              onUpdateObjective={handleEditObjective}
              onUpdateObjectiveField={handleEditObjectiveField}
            />
          )}

          <MainView
            activityTabsRef={activityTabsRef}
            chartContainerRef={chartContainerRef}
            containerWidth={containerWidth}
            currentActivity={currentActivity}
            currentMicroId={currentMicroId}
            currentMicroLabel={microregiaoNome}
            currentNav={currentNav}
            userId={user?.id}
            currentTeam={currentTeam}
            expandedActionUid={expandedActionUid}
            filteredActivities={filteredActivities}
            filteredObjectives={filteredObjectives}
            ganttActions={ganttActions}
            ganttRange={ganttRange}
            ganttStatusFilter={ganttStatusFilter}
            involvedAreaFilter={involvedAreaFilter}
            isEditMode={isEditMode}
            isMobile={isMobile}
            isSaving={isSaving}
            microActions={microActions}
            objectives={objectives}
            activities={activities}
            readOnly={readOnly}
            responsibleFilter={responsibleFilter}
            searchTerm={searchTerm}
            selectedActivity={selectedActivity}
            selectedObjective={selectedObjective}
            statusFilter={statusFilter}
            viewMode={viewMode}
            canCreateObjective={isAdmin || user?.role === 'gestor'}
            onCommunityNavigate={handleCurrentNavChange}
            onAddComment={handleAddComment}
            onAddMember={handleAddMember}
            onAddObjective={handleAddObjective}
            onAddRaci={handleAddRaci}
            onBulkImport={handleBulkCreateActions}
            onCloseActionModal={handleCloseActionModal}
            onCreateAction={handleCreateAction}
            onDashboardNavigate={handleDashboardNavigate}
            onDeleteAction={handleDeleteAction}
            onExpandAction={handleExpandAction}
            onGanttActionClick={handleGanttActionClick}
            onOpenRoadmapSettings={handleOpenRoadmapSettings}
            onRemoveMember={handleRemoveMember}
            onRemoveRaci={handleRemoveRaci}
            onSaveAction={handleSaveAction}
            onSaveAndNewAction={handleSaveAndNewAction}
            onSaveFullAction={handleSaveFullAction}
            onSetGanttRange={setGanttRange}
            onSetGanttStatusFilter={setGanttStatusFilter}
            onSetInvolvedAreaFilter={setInvolvedAreaFilter}
            onSetResponsibleFilter={setResponsibleFilter}
            onSetSearchTerm={setSearchTerm}
            onSetSelectedActivity={setSelectedActivity}
            onSetStatusFilter={setStatusFilter}
            onShowToast={showToast}
            onUpdateAction={handleUpdateAction}
            onUpdateActivity={handleEditActivity}
            onUpdateObjectiveField={handleEditObjectiveField}
            onUpdateTeam={handleUpdateTeam}
            checkCanCreate={checkCanCreate}
            checkCanDelete={checkCanDelete}
            checkCanEdit={checkCanEdit}
          />
        </main>

        <AppOverlays
          SettingsModalComponent={UserSettingsModal}
          allowAvatarChange={allowAvatarChange}
          authContext={authContext}
          checkCanCreate={checkCanCreate}
          confirmModal={confirmModal}
          createActionMicroId={createActionMicroId}
          currentNav={currentNav}
          currentWorkspace={currentWorkspace ?? 'planning'}
          editModalConfig={editModalConfig}
          isAdmin={isAdmin}
          isCreateActionModalOpen={isCreateActionModalOpen}
          isMobile={isMobile}
          isSettingsModalOpen={isSettingsModalOpen}
          settingsInitialTab={settingsInitialTab}
          showMunicipalityModal={showMunicipalityModal}
          showOnboarding={showOnboarding}
          user={user}
          viewMode={viewMode}
          onCloseConfirmModal={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onCloseCreateActionModal={() => setIsCreateActionModalOpen(false)}
          onCloseEditModal={closeEditModal}
          onCloseFirstAccessModal={() => setShowMunicipalityModal(false)}
          onCloseSettingsModal={handleCloseSettingsModal}
          onConfirmCreateAction={handleConfirmCreateInMicro}
          onCreateAction={handleCreateAction}
          onCreateActionMicroIdChange={setCreateActionMicroId}
          onCurrentNavChange={handleCurrentNavChange}
          onEditModalSave={saveEditModal}
          onFirstAccessCompleted={() => {
            setCurrentNav('news');
            setViewMode('table');
          }}
          onOnboardingComplete={handleOnboardingComplete}
          onOnboardingSkip={handleOnboardingSkip}
          onOpenOnboarding={openOnboarding}
          onShowToast={showToast}
          onViewModeChange={setViewMode}
        />
      </div>
    </AppEntryGate>
  );
}

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
          <ObservabilityBootstrap />
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
