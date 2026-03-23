import { useCallback } from 'react';
import { Status } from '../types';

type CurrentPage = 'main' | 'admin' | 'lgpd';
type CurrentNav = 'strategy' | 'home' | 'settings' | 'dashboard' | 'news' | 'hub' | 'forums' | 'mentorship' | 'education' | 'repository';
type ViewMode = 'table' | 'gantt' | 'team' | 'optimized' | 'calendar';
type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security' | 'roadmap';

interface UseNavigationHandlersProps {
  isAdmin: boolean;
  logout: () => void;
  setCurrentPage: (page: CurrentPage) => void;
  setCurrentNav: (nav: CurrentNav) => void;
  setViewMode: (mode: ViewMode) => void;
  setStatusFilter: (status: Status | 'all') => void;
  setSelectedObjective: (objectiveId: number) => void;
  setAllowAvatarChange: (allow: boolean) => void;
  setSettingsInitialTab: (tab: SettingsTab | undefined) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
}

export function useNavigationHandlers({
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
}: UseNavigationHandlersProps) {
  const handleProfileClick = useCallback(() => {
    if (isAdmin) {
      setCurrentPage('admin');
      return;
    }

    setIsSettingsModalOpen(true);
  }, [isAdmin, setCurrentPage, setIsSettingsModalOpen]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleNavigateToMain = useCallback(() => {
    setCurrentPage('main');
  }, [setCurrentPage]);

  const handleDashboardNavigate = useCallback((view: 'list' | 'team', filters?: { status?: string; objectiveId?: number }) => {
    setCurrentNav('strategy');

    if (view === 'team') {
      setViewMode('team');
      return;
    }

    setViewMode('table');
    if (filters?.status) {
      setStatusFilter(filters.status as Status | 'all');
    }
    if (filters?.objectiveId) {
      setSelectedObjective(filters.objectiveId);
    }
  }, [setCurrentNav, setSelectedObjective, setStatusFilter, setViewMode]);

  const handleOpenSettings = useCallback((mode: 'settings' | 'avatar' = 'settings', initialTab?: SettingsTab) => {
    setAllowAvatarChange(mode === 'avatar');
    setSettingsInitialTab(initialTab);
    setIsSettingsModalOpen(true);
  }, [setAllowAvatarChange, setIsSettingsModalOpen, setSettingsInitialTab]);

  return {
    handleProfileClick,
    handleLogout,
    handleNavigateToMain,
    handleDashboardNavigate,
    handleOpenSettings,
  };
}
